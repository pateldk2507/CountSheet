const axios = require('axios');
const { getAccessToken } = require('../utils/UtilData'); 

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

const baseURL = 'https://teleco.halopsa.com/api';

module.exports.index = async function(req,res){  
      try {
            res.render('PackingSlip');
    
          } catch (error) {
              console.log(error);
              res.render('404',{error: error});
          }

}

module.exports.getData = async function(req,res){

    let salesorder = req.query.salesorder;
    
    try{
        options = {
            'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
        };

        const getSalesOrder = await axios.get(`https://teleco.halopsa.com/api/SalesOrder/${salesorder}?includedetails=true`,options)
            .then(res=>{return res.data})
            .catch(function (error) {
                console.log(error.response);
            })

        res.send({data: getSalesOrder});

    }catch(error){
        console.log(error);
          res.render('404',{error: error});
    }
}

