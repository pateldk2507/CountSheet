const axios = require('axios');

module.exports.index  = async function(req,res){

    const url = 'https://teleco.halopsa.com/api/ReportData/bec7f6dc-6768-4115-8eac-cce150a2533d';

    try {
        const response = await axios.get(url);
        // console.log('Data:', response.data);
        res.render('inventory',{data : response.data});

    } catch (error) {
        if (error.response) {
            console.error('Error: Received status code', error.response.status);
        } else {
            console.error('Error fetching data:', error.message);
        }
    }
}