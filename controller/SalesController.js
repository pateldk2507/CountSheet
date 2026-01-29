const axios = require('axios');
const { getAccessToken } = require('../utils/UtilData'); 

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

const baseURL = 'https://teleco.halopsa.com/api';

module.exports.data = async function(req,res){
    try{
        options = {
            'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
        };

        const getSales = await axios.get(`${baseURL}/ReportData/98ad5e5f-5882-466f-9873-7d4dac43a90a`,options).then(res=>{
            return res.data;
        });
        
        const getQuote = await axios.get(`${baseURL}/ReportData/f70fc7a8-d3e1-4bae-b3ae-c6eb0bd28b87`,options).then(res=>{
            return res.data;
        });


        res.send({data: getSales, quote: getQuote});
        
    }catch(error){
        console.log(error);
        res.render('404',{error: error})
    }
}

module.exports.index = async function(req,res){  
    
      try {
            res.render('sales');
    
          } catch (error) {
              console.log(error);
              res.render('404',{error: error});
          }

    }