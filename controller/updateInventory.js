
const { initializeApp } = require("firebase/compat/app");
const { getDatabase, ref, get } = require("firebase/database");
const axios = require('axios');
const { getAccessToken } = require('../utils/UtilData'); 

const fs = require('fs');
const path = require('path');


const firebaseConfig = {
    apiKey: "AIzaSyBXdAmIp2xkXKYA_aUsJ00mmYMC9EfJIvw",
    authDomain: "dashboard-it-3aa1e.firebaseapp.com",
    databaseURL: "https://dashboard-it-3aa1e-default-rtdb.firebaseio.com",
    projectId: "dashboard-it-3aa1e",
    storageBucket: "dashboard-it-3aa1e.appspot.com",
    messagingSenderId: "667956918947",
    appId: "1:667956918947:web:36b220391f8542d4025d16",
    measurementId: "G-YSGKTJ5PGW"
  };
 
  const app = initializeApp(firebaseConfig);
  const database = getDatabase(app);
  const dbRef = ref(database, '/');

module.exports.index = async function (req, res) {
    res.render('updateInventory', { title: 'Update Inventory' });

}

async function getItemDetails(itemID,locationID) {
  try {
    // 1️⃣ Check if item is serialized
     options = {
            'headers' : {'Authorization' : 'bearer ' + await getAccessToken()}
        };
    const itemRes =  await axios.get(`https://teleco.halopsa.com/api/item/${itemID}`, options);

    const dont_track_stock = !!itemRes?.data?.dont_track_stock; // true/false
    if (dont_track_stock) {
      return { skip: true }; // signal to skip in main loop
    }

    const is_serial = itemRes?.data?.asset_type_matching_field_name === "Serial Number" ;
    let asset_ids = [];

    // 2️⃣ If serialized, get first asset ID
    if (is_serial) {
      const assetRes = await axios.get(`https://teleco.halopsa.com/api/asset?item_id=${itemID}`, options);
      const assetData = assetRes.data;

      if (assetData?.assets?.length > 0) {
       asset_ids = assetData.assets
          .filter(a => String(a.site_id) === String(locationID)) // ensure string comparison
          .map(a => a.id);
      }
    }

   return { skip: false, is_serial, asset_ids };
  } catch (err) {
    console.error(`Error fetching item ${itemID}:`, err);
    return { is_serial: false, asset_ids: []};
  }
}

/**
 * Generate JSON for selected location
 */


module.exports.json = async function(req, res) {
  try {
    const { location } = req.query;
    if (!location) return res.status(400).json({ error: "Missing location parameter" });

    const jsonData = [];

    // Fetch main items
    const mainSnap = await get(ref(database, `locations/${location}`));
    if (mainSnap.exists()) {
      const data = mainSnap.val();
      for (const itemID in data.Items) {
        const item = data.Items[itemID];
        if (item.Count && item.Count !== item.OnHand) {
          const { skip, is_serial, asset_ids } = await getItemDetails(itemID, location);

          if (skip) continue; // Skip non-trackable items

          jsonData.push({
            item_id: itemID,
            stocklocation_id: location,
            stockbin_id: -1,
            quantity_in: item.Count - item.OnHand,
            real_quantity_in: item.Count - item.OnHand,
            note: "Inventory count update",
            is_stock_take: true,
            is_serial,
            asset_ids,
          });
        }
      }
    }

    // Fetch extra items
    const extraSnap = await get(ref(database, `locations/${location}/ExtraItems`));
    if (extraSnap.exists()) {
      const data = extraSnap.val();
      for (const itemID in data.Items) {
        const item = data.Items[itemID];
        if (item.Count && item.Count !== item.OnHand) {
         const { skip, is_serial, asset_ids }  = await getItemDetails(itemID, location);
        
            if (skip) continue; // Skip non-trackable items
          jsonData.push({
            item_id: itemID,
            stocklocation_id: location,
            stockbin_id: 0,
            quantity_in: item.Count - item.OnHand,
            real_quantity_in: item.Count - item.OnHand,
            note: "Inventory count update",
            is_stock_take: true,
            is_serial,
            asset_ids,
          });
        }
      }
    }

    // Send JSON as downloadable file
    const jsonString = JSON.stringify(jsonData, null, 2);
    res.setHeader("Content-Disposition", `attachment; filename=location_${location}.json`);
    res.setHeader("Content-Type", "application/json");
    res.send(jsonString);

  } catch (err) {
    console.error("Error generating JSON:", err);
    res.status(500).json({ error: "Failed to generate JSON" });
  }
};

async function generateJsonForLocation(location) {
  const jsonData = [];

  const mainSnap = await get(ref(database, `locations/${location}`));
  if (mainSnap.exists()) {
    const data = mainSnap.val();
    for (const itemID in data.Items) {
      const item = data.Items[itemID];
      if (item.Count && item.Count !== item.OnHand) {
        const { skip, is_serial, asset_ids } = await getItemDetails(itemID, location);
        if (skip) continue;
        jsonData.push({
          item_id: itemID,
          stocklocation_id: location,
          stockbin_id: -1,
          quantity_in: item.Count - item.OnHand,
          real_quantity_in: item.Count - item.OnHand,
          note: "Inventory count update",
          is_stock_take: true,
          is_serial,
          asset_ids
        });
      }
    }
  }

  const extraSnap = await get(ref(database, `locations/${location}/ExtraItems`));
  if (extraSnap.exists()) {
    const data = extraSnap.val();
    for (const itemID in data.Items) {
      const item = data.Items[itemID];
      if (item.Count && item.Count !== item.OnHand) {
        const { skip, is_serial, asset_ids } = await getItemDetails(itemID, location);
        if (skip) continue;
        jsonData.push({
          item_id: itemID,
          stocklocation_id: location,
          stockbin_id: 0,
          quantity_in: item.Count - item.OnHand,
          real_quantity_in: item.Count - item.OnHand,
          note: "Inventory count update",
          is_stock_take: true,
          is_serial,
          asset_ids
        });
      }
    }
  }

  return jsonData;
}

module.exports.apply = async function(req, res) {
  try {
    const { location } = req.body;
    if (!location) return res.status(400).json({ error: "Missing location parameter" });

    // const jsonData = await generateJsonForLocation(location); - Generate JSON internally

    const jsonData = [
  
  {
    "item_id": "207",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "256",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -15,
    "real_quantity_in": -15,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
   {
    "item_id": "319",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
    {
    "item_id": "390",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": []
  },
    {
    "item_id": "663",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -15,
    "real_quantity_in": -15,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
    {
    "item_id": "1061",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1063",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -5,
    "real_quantity_in": -5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1067",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1071",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1074",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1079",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1083",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -5,
    "real_quantity_in": -5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1086",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1087",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -6,
    "real_quantity_in": -6,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1091",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -3,
    "real_quantity_in": -3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1092",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1095",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1096",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1097",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1102",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1105",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1115",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1120",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      46965,
      46966,
      46967,
      46968,
      46969,
      46970,
      46971,
      46972,
      46973,
      46974,
      46976,
      46977,
      46978,
      46979,
      46980,
      46981,
      46982,
      46983,
      46984,
      46985,
      46986,
      46987,
      46988,
      46989,
      46990,
      46991,
      46992,
      46993
    ]
  },
  {
    "item_id": "1130",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      35171
    ]
  },
  {
    "item_id": "1132",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      35173,
      35174,
      35175,
      35176,
      48483
    ]
  },
  {
    "item_id": "1139",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      35199
    ]
  },
  {
    "item_id": "1141",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -14,
    "real_quantity_in": -14,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1146",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      35691,
      35692,
      48721,
      48723,
      48725,
      48722
    ]
  },
  {
    "item_id": "1148",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      46994,
      48717
    ]
  },
  {
    "item_id": "1156",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      36457
    ]
  },
  {
    "item_id": "1158",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -11,
    "real_quantity_in": -11,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1161",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1163",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1164",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1167",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -5,
    "real_quantity_in": -5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1178",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1180",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1181",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1183",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1186",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1193",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1203",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      6941,
      6943,
      6942
    ]
  },
  {
    "item_id": "1204",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      6945,
      6946,
      6947
    ]
  },
  {
    "item_id": "1206",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -45,
    "real_quantity_in": -45,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1214",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      47000,
      47001,
      47002,
      47003,
      47004,
      48486,
      48487,
      48488,
      48489,
      48490,
      48491,
      48492,
      48493
    ]
  },
  {
    "item_id": "1219",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1223",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -26,
    "real_quantity_in": -26,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1243",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      35891,
      35892,
      48499
    ]
  },
  {
    "item_id": "1247",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1251",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -8,
    "real_quantity_in": -8,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      38247,
      38248,
      38249,
      38251,
      38252,
      38254,
      38255,
      38256
    ]
  },
  {
    "item_id": "1265",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1266",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 4,
    "real_quantity_in": 4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      48480,
      48481,
      48482
    ]
  },
  {
    "item_id": "1267",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1291",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      46893
    ]
  },
  {
    "item_id": "1315",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -23,
    "real_quantity_in": -23,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1318",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1333",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 10,
    "real_quantity_in": 10,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1350",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 15,
    "real_quantity_in": 15,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1367",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1377",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1381",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1388",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1389",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -26,
    "real_quantity_in": -26,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1438",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -8,
    "real_quantity_in": -8,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1444",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 7,
    "real_quantity_in": 7,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1456",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      47012
    ]
  },
  {
    "item_id": "1473",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1504",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -3,
    "real_quantity_in": -3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1506",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1519",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -3,
    "real_quantity_in": -3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1531",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1544",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1546",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      48687,
      48689,
      48884,
      48885
    ]
  },
  {
    "item_id": "1570",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -129,
    "real_quantity_in": -129,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1589",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1610",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1621",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1636",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1644",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      48449,
      48738,
      48737,
      48736
    ]
  },
  {
    "item_id": "1726",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1734",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1810",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1841",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 9,
    "real_quantity_in": 9,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1846",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1847",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1859",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -10,
    "real_quantity_in": -10,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1885",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      45688
    ]
  },
  {
    "item_id": "1888",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1934",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1937",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1950",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -65,
    "real_quantity_in": -65,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1951",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 7,
    "real_quantity_in": 7,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1989",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2012",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 13,
    "real_quantity_in": 13,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2013",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 6,
    "real_quantity_in": 6,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2014",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2047",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2074",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -200,
    "real_quantity_in": -200,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2075",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2088",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2101",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -106,
    "real_quantity_in": -106,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2107",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -5,
    "real_quantity_in": -5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2109",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 12,
    "real_quantity_in": 12,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2115",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2116",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      47428
    ]
  },
  {
    "item_id": "2119",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      48428,
      48429,
      48430,
      48431,
      48432,
      48433,
      48434,
      48393,
      48928
    ]
  },
  {
    "item_id": "2174",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -8,
    "real_quantity_in": -8,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2180",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2228",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -108,
    "real_quantity_in": -108,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2430",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -26,
    "real_quantity_in": -26,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2519",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2528",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2530",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2546",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2561",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2595",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2777",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2829",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2847",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2859",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      46508
    ]
  },
  {
    "item_id": "2905",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -4,
    "real_quantity_in": -4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": true,
    "asset_ids": [
      46908,
      46909,
      46910,
      46911
    ]
  },
  {
    "item_id": "2924",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -3,
    "real_quantity_in": -3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2957",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -168,
    "real_quantity_in": -168,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2980",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2983",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -5,
    "real_quantity_in": -5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2988",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3015",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3019",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -100,
    "real_quantity_in": -100,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3025",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 75,
    "real_quantity_in": 75,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3064",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 160,
    "real_quantity_in": 160,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3065",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -227,
    "real_quantity_in": -227,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3089",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3101",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -50,
    "real_quantity_in": -50,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3102",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -50,
    "real_quantity_in": -50,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3103",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -100,
    "real_quantity_in": -100,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3179",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3182",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3183",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3212",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3231",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3235",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -5,
    "real_quantity_in": -5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3243",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -2,
    "real_quantity_in": -2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3258",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -102,
    "real_quantity_in": -102,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3259",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -101,
    "real_quantity_in": -101,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3279",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3287",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": 10,
    "real_quantity_in": 10,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3295",
    "stocklocation_id": "1101",
    "stockbin_id": -1,
    "quantity_in": -1,
    "real_quantity_in": -1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
   {
    "item_id": "182",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 20,
    "real_quantity_in": 20,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "237",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
    {
    "item_id": "341",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "394",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "396",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "408",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "442",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 8,
    "real_quantity_in": 8,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "471",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "508",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 6,
    "real_quantity_in": 6,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "519",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 5,
    "real_quantity_in": 5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "552",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 7,
    "real_quantity_in": 7,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "556",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "640",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "647",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 7,
    "real_quantity_in": 7,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "655",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "662",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 5,
    "real_quantity_in": 5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "759",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "806",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 4,
    "real_quantity_in": 4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "808",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 7,
    "real_quantity_in": 7,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "816",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "850",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 19,
    "real_quantity_in": 19,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "863",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 72,
    "real_quantity_in": 72,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "884",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 41,
    "real_quantity_in": 41,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "916",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 7,
    "real_quantity_in": 7,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "946",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "951",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "952",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1004",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 4,
    "real_quantity_in": 4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1044",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 5,
    "real_quantity_in": 5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1085",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 4,
    "real_quantity_in": 4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1094",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1129",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1135",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1162",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1175",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1176",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1222",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1226",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1242",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1245",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1250",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1345",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1361",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1372",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 4,
    "real_quantity_in": 4,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1382",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1383",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1420",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1571",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 177,
    "real_quantity_in": 177,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1794",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 9,
    "real_quantity_in": 9,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "1959",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2003",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2133",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2162",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2245",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 200,
    "real_quantity_in": 200,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2549",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 5,
    "real_quantity_in": 5,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2550",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 3,
    "real_quantity_in": 3,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2800",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2872",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2920",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "2943",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3017",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 6,
    "real_quantity_in": 6,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3045",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3133",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3156",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3215",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3229",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3376",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 9,
    "real_quantity_in": 9,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3499",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 42,
    "real_quantity_in": 42,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3627",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3646",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3799",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 2,
    "real_quantity_in": 2,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3840",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "3954",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 10,
    "real_quantity_in": 10,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "4046",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "4068",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "4069",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 1,
    "real_quantity_in": 1,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  },
  {
    "item_id": "4190",
    "stocklocation_id": "1101",
    "stockbin_id": 0,
    "quantity_in": 10,
    "real_quantity_in": 10,
    "note": "Inventory count update",
    "is_stock_take": true,
    "is_serial": false,
    "asset_ids": []
  }
];

    const logs = [];
    const options = { headers: { 'Authorization': 'bearer ' + await getAccessToken() } };

    // Helper log function
    const log = (msg) => {
      console.log(msg);
      logs.push(`${new Date().toISOString()} - ${msg}`);
    }

     // Helper delay function
    const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

    // 650 calls per 5 min → 1 call every 460ms
    const REQUEST_DELAY = 600;

    // Process items
    for (const item of jsonData) {
      if (item.is_serial) {
        // Delete only as many assets as quantity_in
        const qtyToDelete = Math.abs(item.quantity_in);
        const idsToDelete = item.asset_ids.slice(0, qtyToDelete);
        if (idsToDelete.length > 0) {
          const idsString = idsToDelete.join(",");
          try {
            await axios.delete(`https://teleco.halopsa.com/api/Asset/0?ids=${idsString}`, options);
            log(`✅ Serialized item ${item.item_id} deleted assets: ${idsString}`);
             await delay(REQUEST_DELAY);
          } catch (err) {
            log(`❌ Error deleting serialized item ${item.item_id}: ${err.message}`);
          }
        } else {
          log(`⚠️ No assets to delete for serialized item ${item.item_id}`);
        }

      } else {
        try {
          await axios.post(`https://teleco.halopsa.com/api/itemstock`, [item], options);
          log(`✅ Non-serialized item ${item.item_id} updated successfully.`);
           await delay(REQUEST_DELAY);
        } catch (err) {
          log(`❌ Error updating non-serialized item ${item.item_id}: ${err.message}`);
        }
      }
    }

    // Save log file
    const logFilePath = path.resolve(`./update_log_${location}.txt`);
    fs.writeFileSync(logFilePath, logs.join("\n"), "utf-8");
    log(`✅ Log file saved: ${logFilePath}`);

    res.json({ message: "Inventory update completed", log_file: logFilePath });
  } catch (err) {
    console.error("Error applying inventory changes:", err);
    res.status(500).json({ error: "Failed to apply inventory changes" });
  }
}
