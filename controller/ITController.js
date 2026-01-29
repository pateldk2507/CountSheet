const axios = require('axios');
const { getAccessToken , getAgents } = require('../utils/UtilData'); 

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}
const baseURL = 'https://teleco.halopsa.com/api';

module.exports.index = async function(req,res){

    var datetime = new Date();
    let TODAY = datetime.toISOString().slice(0,10);

    const thirtyDayAgo = new Date();
    thirtyDayAgo.setDate(thirtyDayAgo.getDate() - 30);

    options = {
        'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
    };
    try {
            const data  =  await  axios.get(`${baseURL}/tickets?status_id=1&requesttype_id=29&includetimetaken=true&includeslatimer=true`,options).then(response => {
                return response.data;
            })

            const SLA = await axios.get(`${baseURL}/tickets?requesttype_id=29&includetimetaken=true&includeslatimer=true&order=slatimeleft&orderdesc=descending&pageinate=true&page_size=100&page_no=1`, options).then (res=> {
                return res.data;
            })

            const allTimeDataInProgress = await axios.get(`${baseURL}/tickets?requesttype_id=29&status_id=2`, options).then(res=> {
                return res.data;
            });

            const allTimeDataWithUser = await axios.get(`${baseURL}/tickets?requesttype_id=29&status_id=4`,options).then(res=> {
                return res.data;
            });


            const getAvgTime = await axios.get(`${baseURL}/ReportData/ce1a8f7a-11f8-405e-94b3-375502151788`).then(response => {
                return response.data;
            });

            const allTimeDataonHold = await axios.get(`${baseURL}/tickets?requesttype_id=29&status_id=21`, options).then(res=> {
                return res.data;
            });

            const Agent = (localStorage.getItem('agent')) ? localStorage.getItem('agent') : await getAgents();
          
        
             res.render('IT',{ status : 'OK', today: TODAY ,  data : data , SlaData : SLA , Agent : Agent.split(','), InProgress : allTimeDataInProgress,WithUser : allTimeDataWithUser , AllTimeAvg : getAvgTime, AllTimeOnHold : allTimeDataonHold});
        } catch (error) {
            console.log(error);
            res.render('404',{error: error});
        }
  }


  module.exports.test = async function(req,res){

    

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