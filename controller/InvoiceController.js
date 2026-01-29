const axios = require('axios');
const { getAccessToken } = require('../utils/UtilData'); 

if (typeof localStorage === "undefined" || localStorage === null) {
    var LocalStorage = require('node-localstorage').LocalStorage;
    localStorage = new LocalStorage('./scratch');
}

const baseURL = 'https://teleco.halopsa.com/api';

module.exports.index = async function(req,res){  
      try {
            res.render('invoice');
    
          } catch (error) {
              console.log(error);
              res.render('404',{error: error});
          }

}

module.exports.getData = async function(req,res){

    let invoiceID = req.query.invoiceID;
    
    try{
        options = {
            'headers' : {'Authorization' : 'bearer ' + await getAccessToken(),}
        };

        const getInvoice = await axios.get(`https://teleco.halopsa.com/api/Invoice/${invoiceID}?includedetails=true`,options)
            .then(res=>{return res.data})
            .catch(function (error) {
                console.log(error.response);
                res.send({data : error.response.statusText , status : 400});
            })

        res.send({data: getInvoice, status : 200});

    }catch(error){
        console.log(error);
          res.render('404',{error: error});
    }
}

