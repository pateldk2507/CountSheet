const {initializeApp} = require("firebase/compat/app");
const { getDatabase, ref, child, get, set, update , remove} = require("firebase/database");
const axios = require('axios');
const { getAccessToken } = require('../utils/UtilData'); 
require('dotenv').config();

const firebaseConfig = {
    apiKey: process.env.API_KEY,
    authDomain: "dashboard-it-3aa1e.firebaseapp.com",
    databaseURL: "https://dashboard-it-3aa1e-default-rtdb.firebaseio.com",
    projectId: "dashboard-it-3aa1e",
    storageBucket: "dashboard-it-3aa1e.appspot.com",
    messagingSenderId: "667956918947",
    appId: "1:667956918947:web:36b220391f8542d4025d16",
    measurementId: "G-YSGKTJ5PGW"
  };
 
  const app = initializeApp(firebaseConfig);
  const database =getDatabase(app);
  const dbRef = ref(database, '/');


  function categorizeByLocation(data) {
    return data.reduce((acc, item) => {
      const { LocationID} = item;
  
      if (!acc[LocationID]) {
        acc[LocationID] = {
          LocationID: LocationID,
          Location: item.Location,
          Items: {}
        };
      }
  
      acc[LocationID].Items[item.ItemID] = 
      {
        SKU: item.SKU,
        ItemDesc: item.ItemDesc,
        OnHand: item.OnHand,
        Cost: item.Cost,
        Count:null
      };
  
      return acc;
    }, {});
  }

  async function syncDataWithFirebase(data) {
    // Ensure data is an object
    if (typeof data !== 'object' || Array.isArray(data)) {
      console.error('Expected data to be an object.');
      return;
    }
  
    // Get existing data from Firebase
    const existingLocationsRef = ref(database, 'locations');
    const snapshot = await get(existingLocationsRef);
  
    if (snapshot.exists()) {
      const existingData = snapshot.val();
  
      // Loop through each location in the incoming data
      for (const locationID in data) {
        const newLocation = data[locationID];
  
        // Check if the location exists in Firebase
        if (existingData[locationID]) {
          const existingLocation = existingData[locationID];
  
          // Loop through each item in the incoming location
          for (const itemID in newLocation.Items) {
            const newItem = newLocation.Items[itemID];
  
            // Add new items to Firebase if they don't exist
            if (!existingLocation.Items[itemID]) {
              const itemRef = ref(database, `locations/${locationID}/Items/${itemID}`);
              await set(itemRef, newItem);
              console.log(`Added new item ${itemID} to LocationID ${locationID}.`);
            }
          }
  
          // Remove items from Firebase that are not in the local data
          for (const itemID in existingLocation.Items) {
            if (!newLocation.Items[itemID]) {
              const itemRef = ref(database, `locations/${locationID}/Items/${itemID}`);
              await remove(itemRef);
              console.log(`Removed item ${itemID} from LocationID ${locationID}.`);
            }
          }
        } else {
          // If the location doesn't exist, create it in Firebase
          const locationRef = ref(database, `locations/${locationID}`);
          await set(locationRef, newLocation);
          console.log(`Added new location ${locationID}.`);
        }
      }
  
      // Optionally, you can remove locations from Firebase that are not in the new data
      for (const locationID in existingData) {
        if (!data[locationID]) {
          const locationRef = ref(database, `locations/${locationID}`);
          await remove(locationRef);
          console.log(`Removed location ${locationID} from Firebase.`);
        }
      }
    } else {
      // If no existing data, set all data directly
      await set(existingLocationsRef, data);
      console.log('Initialized Firebase with new data.');
    }
  }

  async function getAllProductsFromFirebase() {
    try {
      // Reference to the locations node in your Firebase database
      const locationsRef = ref(database, 'locations');
      
      // Get the snapshot of the locations data
      const snapshot = await get(locationsRef);
  
      // Check if the snapshot exists
      if (snapshot.exists()) {
        const data = snapshot.val();
        const formattedData = {};
  
        // Format the data as needed
        for (const locationID in data) {
          const location = data[locationID];
          formattedData[locationID] = {
            LocationID: location.LocationID,
            Location: location.Location,
            Items: {}
          };
  
          // Loop through each item and format it
          for (const itemID in location.Items) {
            const item = location.Items[itemID];
            formattedData[locationID].Items[itemID] = {
              ItemID: itemID,
              SKU: item.SKU,
              ItemDesc: item.ItemDesc,
              OnHand: item.OnHand,
              Cost: item.Cost,
              Count: item.Count
            };
          }
        }
  
        // console.log('Formatted Data:', formattedData);
        return formattedData; // Return formatted data
      } else {
        console.log('No data available.');
        return null; // Handle case where there is no data
      }
    } catch (error) {
      console.error('Error retrieving data from Firebase:', error);
    }
  }

module.exports.index  = async function(req,res){

    const url = 'https://teleco.halopsa.com/api/ReportData/bec7f6dc-6768-4115-8eac-cce150a2533d';

    try {
       
        // const response = await axios.get(url);
        
        // const categorizedData = await categorizeByLocation(response.data);
        // await syncDataWithFirebase(categorizedData);
        
        getAllProductsFromFirebase().then(formattedData => {
            res.render('inventory',{data : formattedData});
        });
        

    } catch (error) {
        if (error.response) {
            console.error('Error: Received status code', error.response.status);
        } else {
            console.error('Error fetching data:', error.message);
        }
    }
}

module.exports.getItem = async function(req,res){
 
  let SKU = req.query.SKU;

  console.log("SKU is " ,SKU);
  
    
    try{
        options = {
            'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
        };

        const getItem = await axios.get(`https://teleco.halopsa.com/api/Item?search=${SKU}`,options)
            .then(res=>{return res.data})
            .catch(function (error) {
                console.log(error.response);
            })

        res.send({data: getItem});

    }catch(error){
        console.log(error);
          res.render('404',{error: error});
    }
}
