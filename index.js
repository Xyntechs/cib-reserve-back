//Requirments
//The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
//The Firebase Admin SDK to access the Firebase Realtime Database.

const bodyParser = require("body-parser");
const express = require("express");
const moment = require("moment")
const app = express();
const Type = require('type-of-is')
const math = require('mathjs');

const database = require("./db");  // m

let found;


// parse application/x-www-form-urlencoded
app.use(bodyParser.urlencoded({ extended: false }));

// parse application/json
app.use(bodyParser.json());

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original\
app.post("/addMessage", async (req, res) => {
  // Add a new document in collection "cities" with ID 'LA'
  try {
    console.log(JSON.stringify(req.body), "addMessage route");
    res.status(200).send(req.body);
  } catch (err) {
    res.send(err.message);
  }
});

var dayTimeSlot = {
  start: "",
  end: ""
  //if the Time Slot is not registered initially or set free by the user
  //the clientId field should be 0
};


//Data used in requests to return JSON objects to Front End
var counter = { counterId: "", timeSlots: [] };
var counters = [];






var prepareReservations = {
  //This function is to delete any past reservations from the database
  deleteAnyPastReservations(bank, branch) {
    //Get current day time
    var currentDate = new Date();
    var month = currentDate.getMonth() + 1;
    var day = currentDate.getDate();
    var year = currentDate.getFullYear();

    //Get timeframes referrence
    var timeFramesRef = database.getDocumentFromCollection(bank, branch).collection('TimeFrames');

    var yearLookup = 'year';
    var monthLookup = 'month';
    var dayLookup = 'day';

    //Find old timeframes and write a batch do delete them
    timeFramesRef.get().then(function (querySnapshot, docId) {
      var batch = database.getBatch();
      querySnapshot.forEach(doc => {

        if (!(doc.data()[yearLookup] > year) &&
          !(doc.data()[yearLookup] == year &&
            doc.data()[monthLookup] > month) &&
          !(doc.data()[yearLookup] == year &&
            doc.data()[monthLookup] == month &&
            doc.data()[dayLookup] >= day)) {
          batch.delete(doc.ref);
        }
      });
      return batch.commit();
    }).catch(err => {
      console.log(err.message);
    });
  },


  //Something like singleton but on database reference to create the DayTimeFrame
  async findORCreateDayTimeFrame(res, resDate, bank, branch, service) {

    var timeFramesRef = database.getDocumentFromCollection(bank, branch).collection('TimeFrames');
    var day, month, year;
    day = resDate.getDate();
    month = resDate.getMonth() + 1;
    year = resDate.getFullYear();

    var servicesSnapShot = await database.getCollection('Services').where('Service Name', '==', service).get()

    if (servicesSnapShot.empty)
      return res.status(500).json({ error: "The service is unavailable in all counters" });

    var countersRef = await database.getDocumentFromCollection(bank, branch).collection('Counters').get()

    var done = await countersRef.forEach(async counterSnap => {
      console.log(day);
      console.log(month);
      console.log(year);

      var timeFrameOnDate = timeFramesRef.where('day', '==', day).where('month', '==', month).where('year', '==', year)
      if (timeFrameOnDate.empty) {
        return this.createDayTimeFrame(res, service, day, month, year);
      }
      else {
        counter.counterId = counterSnap.id;
        console.log(counterSnap.id);
        try {
          counter.timeSlots = await this.findCounterTimeSlots(bank, branch, timeFrameOnDate, service);
          counters.push(counter);
        }
        catch (error) {
          console.log(error, " -- returnAvailableSlots route")
          return res.status(500).json({ error: "Something went wrong, try again later" })
        }
      }
    })
    return res.status(200).json(counters)

  },

  async findCounterTimeSlots(bank, branch, timeFrameOnDate, service) {
    var timeSlots = [];
    var timeSlot = { 'start': '', 'end': '' };

    var branchReference = database.getDocumentFromCollection(bank, branch);
    var timeFrameOnDateSnap = await timeFrameOnDate.get();
    timeFrameOnDateSnap.forEach(async timeFrameOnDateSnap => {
      var timeSlotsSnap = await timeFrameOnDateSnap.ref.collection('TimeSlots').get()
      //Get working hours
      var workHrs;
      var doc = await branchReference.get();
      workHrs = doc.data()['Working Hours'].split('-'); //start: workHrs[0], end: workHrs[1]
      var startHrs = parseInt(workHrs[0].split(':')[0]);
      var startMins = parseInt(workHrs[0].split(':')[1]);
      var endHrs = parseInt(workHrs[1].split(':')[0]);
      var endMins = parseInt(workHrs[1].split(':')[1]);
      var numOfMins = ((endHrs - startHrs) * 60 + (endMins - startMins));


      var serviceSnap = branchReference.collection('Services').where('Service Id', '==', service).get();
      serviceSnap.forEach(serviceSnapShot => {
        var serviceETA = parseInt(serviceSnapShot.data()['Service ETA']);
        for (var min = startMins + 60 * startHrs; min < numOfMins; min++) {
          var start = min;
          var end = start + serviceETA;
          var consistent = true;

          for (let timeSlotSnap of timeSlotsSnap.docs()) {
            if (!this.isConsistent(start, end, timeSlotSnap.data()['start'], timeSlotSnap.data()['end'])) {
              consistent = false;
            }
          }

          if (consistent) {
            var stringStartHrs = String(Math.floor(start / 60));
            var stringStartMins = String(start % 60);
            var stringEndHrs = String(Math.floor(end / 60));
            var stringEndMins = String(end % 60);
            timeSlot['start'] = stringStartHrs + ":" + stringStartMins;
            timeSlot['end'] = stringEndHrs + ":" + stringEndMins;
            timeSlots.push(timeSlot);
          }
        }
      })
    })
    return timeSlots;
  },

  createDayTimeFrame(res, serviceCounters, day, month, year) {



  },

  isConsistent(objectStart, objectEnd, subjectStart, subjectEnd) { //returns if the object time slot is consistent to exist with the subject time slot.

    var subjectStartHrs = parseInt(subjectStart.split(':')[0]);
    var subjectStartMins = parseInt(subjectStart.split(':')[1]);

    var subjectEndHrs = parseInt(subjectEnd.split(':')[0]);
    var subjectEndMins = parseInt(subjectEnd.split(':')[1]);

    var subjectSt = subjectStartMins + 60 * subjectStartHrs;
    var subjectEn = subjectEndMins + 60 * subjectEndHrs;

    if ((objectStart > subjectSt && objectStart < subjectEn)
      || (objectEnd > subjectSt && objectEnd < subjectEn)
      || (objectStart <= subjectSt && objectEnd >= subjectEn))
      return false;
    else
      return true;

  }


  /*
      if (timeFramesRef.where('day', '==', day).where('month', '==', month).where('year', '==', year).exists()) {
        var countersRef = database.getDocumentFromCollection(bank, branch).collection('Counters');
        if (!countersRef.exists()) {
          throw new Error('There is no counter supports this service');
        }
        var Counters = await countersRef.get()
        Counters.forEach(async (Counter) => {
          if (Counter.where('Service Id', '==', service).exist()) {
            var counterTimeSlots = timeFrame.where('counterId', '==', doc.id);
            var timeFrameSnapShot = await counterTimeSlots.get()
            timeFrameSnapShot.forEach(counterTimeSlot => {
              dayTimeSlot.start = counterTimeSlot.getData('start');
              dayTimeSlot.end = counterTimeSlot.getData('end');
              counter.counterId = counterTimeSlot.getData('counterId');
              counter.timeSlots.push(dayTimeSlot);
            });
            counters.push(counter);
          }
        });
      }
      else { //yabny ana msh 3aref a send lel functio
  
        var branchReference = DB.collection(bank).doc(branch);
  
        //Get working hours
        var workHrs;
        branchReference.get().then(doc => {
          workHrs = doc.Data().get('Working Hours').split('-'); //start: workHrs[0], end: workHrs[1]
        });
  
        var startHrs = parseInt(workHrs[0].split(':')[0]);
        var startMins = parseInt(workHrs[0].split(':')[1]);
        var serviceETA = parseInt(branchReference.collection(''));
  
        var endHrs = parseInt(workHrs[1].split(':')[0]);
        var endMins = parseInt(workHrs[1].split(':')[1]);
        var numOfSlots = ((endHrs - startHrs) * 60 + (endMins - startMins));
  
  
        DB.collection('Counters').get().then(querySnapshot => {
          querySnapshot.forEach(counter => {
            if (counter.collection(Services).where("Service Id", '==', service).exists()) {
              var i;
              for (i = 1; i < numOfSlots; i++) {
                minute.value = i;
                dayTimeFrame.push(minute);
              }
              countersDB.push(dayTimeFrame);
            }
          });
          //Create day Time Frame and store it in the database
          //Divide the working hrs according to the service for the counters supporting this service
          branchReference.collection('Counters').where('', '', service).get().then(querySnapshot => {
            querySnapshot.forEach(counter => {
              //for each counter create the timeslots  
              counter.get('')
  
            });
  
          });
  
  
  
  
  
        }
        return counters;
      }*/

}


// da first, lazm t3ml el function ely bt3ml fe7a await async
app.post("/returnAvailableSlots", async (req, res) => {


  try {
    var bank = req.body.bank;
    var branch = req.body.branch;
    var clientId = req.body.clientId;
    var service = req.body.service;
    var resDate = moment(req.body.date, "YYYYMMDD") // '20111031'
    console.log(resDate, req.body.date, "DATEEEE")
    //recieve the bank, branch, client ID, the service, reservation day date

    //Is the client registered in the app?
    var registeredClient = (await database.getDocumentFromCollection('Users', clientId).get());
    if (!registeredClient.exists) {
      console.log("User isn't registered", registeredClient);
      return res.status(500).json({ error: "User doesn't exist" }); // lw 3ayz t return , e3ml return b res
    }


    //Is the client already has a date?
    let found;
    var timeFramesSnapShot = await database.getDocumentFromCollection(bank, branch).collection('TimeFrames').get();
    timeFramesSnapShot.forEach(async doc => {
      var timeSlotReg = doc.ref.collection('TimeSlots');
      var timeSlotsSnapShot = await timeSlotReg.get();
      timeSlotsSnapShot.forEach(doc => {
        if (doc.data()['clientId'] == clientId) {
          console.log("User already has an appointment", doc)
          found = true;
        }
      });
    });
    if (found)
      return res.status(500).json({ error: "User already has an appointment" });
    prepareReservations.deleteAnyPastReservations(bank, branch);
    var finished = await prepareReservations.findORCreateDayTimeFrame(res, resDate.toDate(), bank, branch, service)
    return finished;
  }
  catch (error) {
    console.log(error, " -- returnAvailableSlots route")
    return res.status(500).json({ error: "Something went wrong, try again later" })
  }

  // res.status(200).send("Done");

  /*
  try {
    prepareReservations.findORCreateDayTimeFrame(date, bank, branch, service);
  }
  catch (err) {
    console.log(err.message);
  }
  */

  //res.status(200).send(counters);
});


const listener = app.listen(process.env.PORT || 5000, function () {
  console.log("Listening on port " + listener.address().port); //Listening
});
