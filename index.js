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



//Data used in requests to return JSON objects to Front End
var counter = { counterId: "", timeSlots: [] };




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
    var counters = [];

    var timeFramesRef = database.getDocumentFromCollection(bank, branch).collection('TimeFrames');
    var day, month, year;
    day = resDate.getDate();
    month = resDate.getMonth() + 1;
    year = resDate.getFullYear();

    var servicesSnapShot = await database.getCollection('Services').where('Service Name', '==', service).get()

    if (servicesSnapShot.empty)
      return res.status(500).json({ error: "The service is unavailable in all counters" });

    var countersRef = await database.getDocumentFromCollection(bank, branch).collection('Counters').get()

    for (let counterSnap of countersRef.docs) {
      var timeFrameOnDate = await timeFramesRef.where('day', '==', day).where('month', '==', month).where('year', '==', year).get()
      if (timeFrameOnDate.empty) {
        try {
          var createdTimeSlots = await this.createDayTimeFrame(bank, branch, service);
          counters.push({ 'counterId': counterSnap.id, 'timeSlots': createdTimeSlots });
        }
        catch (error) {
          console.log(error, " -- returnAvailableSlots route")
          return res.status(500).json({ error: "Something went wrong, try again later" })
        }

      } else {
        try {
          var counterTimeSlots = await this.findCounterTimeSlots(bank, branch, timeFrameOnDate, service, counterSnap.id);
          counters.push({ 'counterId': counterSnap.id, 'timeSlots': counterTimeSlots });
        }
        catch (error) {
          console.log(error, " -- returnAvailableSlots route")
          return res.status(500).json({ error: "Something went wrong, try again later" })
        }
      }
    }

    return res.status(200).json(counters)
  },

  async findCounterTimeSlots(bank, branch, timeFramesOnDateSnap, service, counterId) {
    var timeSlots = [];

    var branchReference = database.getDocumentFromCollection(bank, branch);


    for (let timeFrameOnDateSnap of timeFramesOnDateSnap.docs) {
      var timeSlotsSnap = await timeFrameOnDateSnap.ref.collection('TimeSlots').where('counterId', '==', counterId).get()
      //Get working hours
      var workHrs;
      var doc = await branchReference.get();
      workHrs = doc.data()['Working Hours'].split('-'); //start: workHrs[0], end: workHrs[1]
      var startHrs = parseInt(workHrs[0].split(':')[0]);
      var startMins = parseInt(workHrs[0].split(':')[1]);
      var endHrs = parseInt(workHrs[1].split(':')[0]);
      var endMins = parseInt(workHrs[1].split(':')[1]);
      var numOfMins = endHrs * 60 + endMins;


      var serviceSnap = await database.getCollection('Services').where('Service Name', '==', service).get();
      for (let serviceSnapShot of serviceSnap.docs) {
        var serviceETA = parseInt(serviceSnapShot.data()['Service ETA']);
        for (var min = startMins + 60 * startHrs; min < (numOfMins - serviceETA); min++) {
          var start = min;
          var end = start + serviceETA;
          var consistent = true;

          for (let timeSlotSnap of timeSlotsSnap.docs) {
            if (!this.isConsistent(start, end, timeSlotSnap.data()['start'], timeSlotSnap.data()['end'])) {
              consistent = false;
            }
          }

          if (consistent) {
            var stringStartHrs = (Math.floor(start / 60) < 10) ? `0${String(Math.floor(start / 60))}` : Math.floor(start / 60);
            var stringStartMins = (start % 60 < 10) ? `0${String(start % 60)}` : String(start % 60);
            var stringEndHrs = (Math.floor(end / 60) < 10) ? `0${String(Math.floor(end / 60))}` : String(Math.floor(end / 60));
            var stringEndMins = (end % 60 < 10) ? `0${String(end % 60)}` : String(end % 60);

            timeSlots.push({
              start: stringStartHrs + ":" + stringStartMins,
              end: stringEndHrs + ":" + stringEndMins
            });

            min = end;
          }
        }
      }
    }


    return timeSlots;
  },

  async createDayTimeFrame(bank, branch, service) {
    var timeSlots = [];

    var branchReference = database.getDocumentFromCollection(bank, branch);

    //Get working hours
    var workHrs;
    var doc = await branchReference.get();
    workHrs = doc.data()['Working Hours'].split('-'); //start: workHrs[0], end: workHrs[1]
    var startHrs = parseInt(workHrs[0].split(':')[0]);
    var startMins = parseInt(workHrs[0].split(':')[1]);
    var endHrs = parseInt(workHrs[1].split(':')[0]);
    var endMins = parseInt(workHrs[1].split(':')[1]);
    var numOfMins = endHrs * 60 + endMins;


    var serviceSnap = await database.getCollection('Services').where('Service Name', '==', service).get();
    for (let serviceSnapShot of serviceSnap.docs) {
      var serviceETA = Math.round(serviceSnapShot.data()['Service ETA']);
      for (var min = startMins + 60 * startHrs; min < (numOfMins - serviceETA); min = min + serviceETA) {
        var start = min;
        var end = start + serviceETA;
        var consistent = true;
        var stringStartHrs = (Math.floor(start / 60) < 10) ? `0${String(Math.floor(start / 60))}` : Math.floor(start / 60);
        var stringStartMins = (start % 60 < 10) ? `0${String(start % 60)}` : String(start % 60);
        var stringEndHrs = (Math.floor(end / 60) < 10) ? `0${String(Math.floor(end / 60))}` : String(Math.floor(end / 60));
        var stringEndMins = (end % 60 < 10) ? `0${String(end % 60)}` : String(end % 60);

        timeSlots.push({
          start: stringStartHrs + ":" + stringStartMins,
          end: stringEndHrs + ":" + stringEndMins
        });
      }
    }


    return timeSlots;

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
});



app.post("/reserveTimeSlot", async (req, res) => {
  var bank = req.body.bank;
  var branch = req.body.branch;
  var clientId = req.body.clientId;
  var counterId = req.body.counterId;
  var start = req.body.start;
  var end = req.body.end;
  var notes = req.body.notes;
  var service = req.body.service;
  var resDate = moment(req.body.date, "YYYYMMDD").toDate();

  //Is the client registered in the app?
  var registeredClient = (await database.getDocumentFromCollection('Users', clientId).get());
  if (!registeredClient.exists) {
    console.log("User isn't registered", registeredClient);
    return res.status(500).json({ error: "User doesn't exist" }); // lw 3ayz t return , e3ml return b res
  }

  //Is the client already has a date?
  let found;
  var timeFramesSnapShot = await database.getDocumentFromCollection(bank, branch).collection('TimeFrames').get();
  for (let doc of timeFramesSnapShot.docs) {
    var timeSlotReg = doc.ref.collection('TimeSlots');
    var timeSlotsSnapShot = await timeSlotReg.get();
    for (let doc of timeSlotsSnapShot.docs) {
      if (doc.data()['clientId'] == clientId) {
        console.log("User already has an appointment", doc)
        found = true;
      }
    }
  }
  if (found)
    return res.status(500).json({ error: "User already has an appointment" });

  var branchReference = database.getDocumentFromCollection(bank, branch);

  var timeFrameOnDate = await branchReference.collection('TimeFrames').where('year', '==', resDate.getFullYear()).where('month', '==', (resDate.getMonth() + 1)).where('day', '==', resDate.getDate()).get()

  if (timeFrameOnDate.empty) {
    try {
      var addedTimeFrame = await branchReference.collection('TimeFrames').add({
        'year': resDate.getFullYear(),
        'month': (resDate.getMonth() + 1),
        'day': resDate.getDate(),

      });

      var addedTimeSlot = await addedTimeFrame.collection('TimeSlots').add({
        'start': start,
        'end': end,
        'counterId': counterId,
        'clientId': clientId,
        'notes': notes,
        'Service Name': service
      })
      return res.status(200).json(`The time slot has been reserved by ${clientId}`)
      console.log('Added timeSlot with ID: ', ref.id);
    }
    catch (error) {
      return res.status(200).json({ error: "Something went wrong, try again later" })
    };
  }
  else {
    for (let timeFrameSnap of timeFrameOnDate.docs) {
      try {
        var addedTimeSlot = await timeFrameSnap.ref.collection('TimeSlots').add({
          'start': start,
          'end': end,
          'counterId': counterId,
          'clientId': clientId,
          'notes': notes,
          'Service Name': service
        });
        return res.status(200).json(`The time slot has been reserved by ${clientId}`)

      }
      catch (error) {
        return res.status(200).json({ error: "Something went wrong, try again later" })
      }
    }
  }
});

app.post("/deleteTimeSlot", async (req, res) => {

  var clientId = req.body.clientId;
  var bank = req.body.bank;
  var branch = req.body.branch;

  try {
    var TimeFramesSnap = await database.getDocumentFromCollection(bank, branch).collection('TimeFrames').get();
    for (let TimeFrameSnap of TimeFramesSnap.docs) {
      var TimeSlotsSnap = await TimeFrameSnap.ref.collection('TimeSlots').where('clientId', '==', clientId).get();
      for (let TimeSlotSnap of TimeSlotsSnap.docs) {
        TimeSlotSnap.ref.delete();
      }
    }
    return res.status(200).json(`The time slot has been removed by ${clientId}`);
  }
  catch (error) {
    return res.status(200).json({ error: "Something went wrong, try again later" })
  }
});

var gain = 0.05;
app.post("/feedBackService", async (req, res) => {

  var service = req.body.service;
  var serviceETAFeedback = parseFloat(req.body.serviceETA);

  try {

    var serviceSnap = await database.getCollection('Services').where('Service Name', '==', service).get();
    for (let serviceSnapShot of serviceSnap.docs) {
      var serviceETA = parseFloat(serviceSnapShot.data()['Service ETA']);
      var newServiceETA = serviceETA * (1 - gain) + gain * serviceETAFeedback;

      serviceSnapShot.ref.update({ "Service ETA": newServiceETA });
    }

    return res.status(200).json(`${service} has been updated`);
  }
  catch (error) {
    return res.status(200).json({ error: "Something went wrong, try again later" })
  }
});


const listener = app.listen(process.env.PORT || 5000, function () {
  console.log("Listening on port " + listener.address().port); //Listening
});
