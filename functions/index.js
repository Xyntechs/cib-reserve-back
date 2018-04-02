import { SIGTERM } from 'constants';

//Requirments 
//The Cloud Functions for Firebase SDK to create Cloud Functions and setup triggers.
//The Firebase Admin SDK to access the Firebase Realtime Database.
const functions = require('firebase-functions');
const admin = require('firebase-admin');
//var bodyParser = require('body-parser');


// // Create and Deploy Your First Cloud Functions
// // https://firebase.google.com/docs/functions/write-firebase-functions

admin.initializeApp(functions.config().firebase);

// Take the text parameter passed to this HTTP endpoint and insert it into the
// Realtime Database under the path /messages/:pushId/original
exports.addMessage = functions.https.onRequest((req, res) => {

  // Add a new document in collection "cities" with ID 'LA'
  db.collection('Test').doc('Test').set(req.query.text);
});


var dayTimeSlot = function (start, end, clientId) {
  this.start = start;
  this.end = end;
  this.clientId = clientId;
  //if the Time Slot is not registered initially or set free by the user 
  //the clientId field should be 0
}

var dayTimeFrame = {
  timeSlots =[],
  day,
  month,
  year
}





var prepareReservations = {

  //This function is to delete any past reservations from the database
  deleteAnyPastReservations(bank, branch) {
    //Get current day time
    var currentDate = new Date();
    var mon = currentDate.getMonth();
    var day = currentDate.getDay();
    var year = currentDate.getFullYear();


    var branchReservations = admin.firestore.collection(bank).doc(branch).collection('Reservations');
    branchReservations.get().then(function (querySnapshot) {
      if (!querySnapshot.exists() || querySnapshot.docs.legnth() == 0) {
        return;
      }
    }).catch(err => {
      console.log('Error getting documents', err);
    });



    // this is the rest of the application.
    // deal with caution.

    //lw el ragl geh fe m3ad 8er m3ado aw geh mn 8er ma ysgl 3la el site
    //  - el ragl.kickout = true
    //lw l2
    //  - welcome el 3meel with open arms.

    // end of application code.
    // run with caution.


    var currentBranchReservations = branchReservations.where('day', '>=', day).where('month', '>=', mon).where('year', '>=', year);
    var Exist;
    branchReservations.get().then(function (querySnapshot) {
      querySnapshot.forEach(doc => {
        Exist = false;
        currentBranchReservations.get().then(function (currQuerySnapshot) {
          currQuerySnapshot.forEach(currDoc => {
            if (doc == currDoc)
              Exist = true;
          })
        }).catch(err => {
          console.log('Error getting documents', err);
        });
        if (!Exist)
          doc.delete();
      }
      )
    });
  },

  //Something like singleton but on database reference to create the DayTimeFrame
  findORCreateDayTimeFrame(date) {
    var branchReservations = admin.firestore.collection(bank).doc(branch).collection('Reservations');
    var day, month, year;
    day = date.getDay();
    month = date.getMonth();
    year = date.getFullYear();
    if (branchReservations.where('day', '==', day).where('month', '==', month).where('year', '==', year).exists()) {
      dayTimeFrame.day = day;
      dayTimeFrame.month = month;
      dayTimeFrame.year = year;
      var branchReference = admin.firestore.collection(bank).doc(branch);

      //Get working hours
      var workHrs;
      branchReference.get().then(doc => {
        workHrs = doc.Data().get('Working Hours').split('-'); //start: workHrs[0], end: workHrs[1]
      }
        //Divide the working hrs according to the service for the counters supporting this service





      ).catch(err => {
        console.log('Error getting document', err);
      });


    }
    else {
      //Create day Time Frame and store it in the database



    }
  }
}

exports.returnAvailableSlots = functions.https.onRequest((req, res) => {
  //recieve the bank, branch, client ID, the service, reservation day date

  //Is the client registered in the app?
  registeredClients = admin.firestore.collection(Clients);
  registeredClients.get().then(function (querySnapshot) {
    if (!querySnapshot.where('clientId', '=', clientId).exists)
      return;
  }).catch(err => {
    console.log('Error getting documents', err);
  });

  //Is the client already has a date?
  var branchReservations = admin.firestore.collection(bank).doc(branch).collection('Reservations');
  branchReservations.get().then(function (querySnapshot) {
    if (querySnapshot.where('clientID', '=', clientID).exists()) {
      return;
    }
  }).catch(err => {
    console.log('Error getting documents', err);
  });


  var bank = req.body.bank;
  var branch = req.body.branch;
  var userID = req.body.clientID;
  var service = req.body.service;
  var date = req.body.date;

  prepareReservations.deleteAnyPastReservations(bank, branch);
  var DayTimeFrame = prepareReservations.findORCreateDayTimeFrame(date, bank, branch, service);



});




