//Requirments
//The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
//The Firebase Admin SDK to access the Firebase Realtime Database.
// hwa da el error, good luck b2a .. en heroku by2ol can't start bsbb da 5las
// 23ml deploy w isa el logs ht2ol eno sh8al msh error w exit process .. tmm ana bs ma5dtish baly 3amlt a 3ashan kda basal
const bodyParser = require("body-parser");
const database = require("./db");
const express = require("express");
const app = express();

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

var counter = { counterId: "", timeSlots: [] };

var counters = [];

var minute = { reserved: false, value: 0 };
var dayTimeFrame = [];
var countersDB = [];

/*
var i;
for(i =1; i<(numOfSlots); i++)
{
timSlotIndex.min = i;
timeFrameIndex.push(timeSlotIndex);
}

*/

var prepareReservations = {
  //This function is to delete any past reservations from the database
  deleteAnyPastReservations(bank, branch) {
    //Get current day time
    var currentDate = new Date();
    var mon = currentDate.getMonth();
    var day = currentDate.getDay();
    var year = currentDate.getFullYear();

    var timeFramesRef = database
      .getDocumentFromCollection(bank, branch)
      .collection("TimeFrames");

    timeFramesRef.doc().update(
      {
        "day": "30"
      }
    );

    //   var branchReservations = database
    //   .getDocumentFromCollection(bank, branch);

    // branchReservations
    //   .get()
    //   .then(function (querySnapshot) {
    //     if (!querySnapshot.exists() || querySnapshot.docs.legnth() == 0) {
    //       throw new Error("There isn't any reservations");
    //     }
    //   })
    //   .catch(err => {
    //     throw new Error("Error getting documents");
    //   });

    /*
    var Exist;
    timeFramesRef.get().then(function (querySnapshot) {
      querySnapshot.forEach(doc => {
        if (doc.getData("year") > year) {
          Exist = true;

        } else if (
          doc.getData("year") == year &&
          doc.getData("month") > month
        ) {
          Exist = true;
        } else if (
          doc.getData("year") == year &&
          doc.getData("month") == month &&
          doc.getData("day") >= day
        ) {
          Exist = true;
        } else {
          console.log("Works");
          Exist = false;
        }
        if (!Exist) doc.delete();

      });
    });
*/
  }
  /*
  //Something like singleton but on database reference to create the DayTimeFrame
  async findORCreateDayTimeFrame(date, bank, branch, service) {
    var timeFramesRef = DB.collection(bank).doc(branch).collection('TimeFrames');
    var day, month, year;
    day = date.getDay();
    month = date.getMonth();
    year = date.getFullYear();
    if (timeFramesRef.where('day', '==', day).where('month', '==', month).where('year', '==', year).exists()) {
      var countersRef = admin.firestore.collection(bank).doc(branch).collection('Counters');
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
};

app.post("/returnAvailableSlots", (req, res) => {
  //recieve the bank, branch, client ID, the service, reservation day date
  /*
    //Is the client registered in the app?
    registeredClients = admin.firestore.collection(Clients);
    registeredClients.get().then(function (querySnapshot) {
      if (!querySnapshot.where('clientId', '==', clientId).exists)
        return;
    }).catch(err => {
      console.log('Error getting documents', err);
    });
  
    //Is the client already has a date?
    var branchReservations = admin.firestore.collection(bank).doc(branch).collection('Reservations');
    branchReservations.get().then(function (querySnapshot) {
      if (querySnapshot.where('clientId', '==', clientId).exists()) {
        return;
      }
    }).catch(err => {
      console.log('Error getting documents', err);
    });
  
  */
  var bank = req.body.bank;
  var branch = req.body.branch;
  var clientId = req.body.clientId;
  var service = req.body.service;

  //For testing
  /*
   try {
     console.log(JSON.stringify(req.body.bank), "addMessage route");
     res.status(200).send(req.body.bank);
   } catch (err) {
     res.send(err.message);
   }
   */
  var resDate = new Date(req.body.date); //new date('11/7/2017');

  try {
    prepareReservations.deleteAnyPastReservations(bank, branch);
  } catch (err) {
    console.log(err);
    res.send(err.message);
  }

  res.status(200).send("Done");

  // ana harwa7 we hakaml
  // mariam mshyt !
  //bye bye :D @mariam
  // bye bye, bokra b2a bs msh hnseb el back da
  //eshta
  //yalla salam nw :D
  //hanrwa7 we netkalm ya se7s, slam
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
