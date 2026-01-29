const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { getAccessToken, getAgents } = require('../utils/UtilData'); 


if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

const baseURL = 'https://teleco.halopsa.com/api';
const dataFolder = path.join(__dirname, '../data');
const filePath = path.join(dataFolder, 'Tech.txt');

// Function to extract IDs from text file
function extractIdsFromFile(filePath) {
    const data = fs.readFileSync(filePath, 'utf8');
    const idMatches = data.match(/ID:\s*(\d+)/g);
    return idMatches ? idMatches.map(match => match.split(':')[1].trim()) : [];
}

module.exports.index = async function(req,res){

const agentIds = extractIdsFromFile(filePath);
  

  var datetime = new Date();
  let TODAY = datetime.toISOString().slice(0,10);

  const next6Days = new Date();
  next6Days.setDate(next6Days.getDate() + 7);

  const NEXTDAY = next6Days.toISOString().slice(0,10);

  try {
          options = {
             'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
          };

          const getWeeklySchedule = await axios.get(`${baseURL}/appointment?start_date=${TODAY}&end_date=${NEXTDAY}&showappointments=true&agents=${agentIds}`,options).then(res=>{
              return res.data;
          });   
          
          const Agent = (localStorage.getItem('agent')) ? localStorage.getItem('agent') : await getAgents();

    
          res.render('weeknew', {weeklyData: getWeeklySchedule, Agent : Agent.split(','), agentIds : agentIds});

      } catch (error) {
          console.log(error);
          res.render('404',{error: error});
      }
          
}