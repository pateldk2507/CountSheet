const axios = require('axios');
const { getAccessToken , getAgents } = require('../utils/UtilData'); 
const { log } = require('console');

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}
const baseURL = 'https://teleco.halopsa.com/api';

module.exports.index = async function(req,res){

    var datetime = new Date();
    let TODAY = datetime.toISOString().slice(0,10);

    const fifteenDayAgo = new Date();
    fifteenDayAgo.setDate(fifteenDayAgo.getDate() - 15);

    options = {
        'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
    };
    try {
            const data  =  await  axios.get(`${baseURL}/Timesheet?selectedTeam=0&showholidays=false&selectedAgents=32&selectedTypes=0%2C1%2C2%2C3%2C4%2C5%2C6&selectedStatuses=0%2C1&selectedLocations=0&showtasks=true&showappointments=true&showchanges=false&workhoursonly=true&start_date=2025-12-01T00:00:00.000Z&end_date=2025-12-31T00:00:00.000Z&agents=32&showalldays=true&includetimesheetfields=true&inclusive_start=true&utcoffset=300`,options).then(response => {
                return response.data;
            })
            
             res.render('timesheet',{ status : 'OK', data : data });

        } catch (error) {
            console.log(error);
            res.render('404',{error: error});
        }
  }


module.exports.getItem = async function(req,res){

    

    console.log(req.query);
    for(var i in req.query){
        console.log(i,req.query[i]);
    }

    options = {
        'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
    };
    try {
            const data  =  await  axios.get(`${baseURL}/${req.query.api}`,options).then(response => {
                return response.data;
            });

            res.send(data);

        } catch (error) {
            console.log(error);
            res.render('404',{error: error});
        }
  }