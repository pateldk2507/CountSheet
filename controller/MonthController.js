const axios = require('axios');
const { getAccessToken } = require('../utils/UtilData'); 

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

const baseURL = 'https://teleco.halopsa.com/api';

module.exports.index = async function(req,res){
    res.render('month');
}

module.exports.getData = async function(req,res){  

    let startdate = req.query.startDate;
    let enddate = req.query.endDate;

    console.log("startDate: " + startdate);
    console.log("end date: " + enddate);

    options = {
        'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
    };
      try {
             const data = await axios.get(`${baseURL}/Appointment?start_date=${startdate}&end_date=${enddate}&hidecompleted=true&tasksonly=true&agents=24,36,27,28,22,31`,options).then(res=>{
                 return res.data;
             });
            
            const Agent = (localStorage.getItem('agent')) ? localStorage.getItem('agent') : await getAgents();
            res.send({Appointment: data, AgentName: Agent});

          } catch (error) {
              console.log(error);
              res.render('404',{error: error});
          }

    }