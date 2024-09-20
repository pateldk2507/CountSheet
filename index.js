const express = require('express')
const app =  express();
const port = 3000;

app.set('view engine', 'ejs');
app.use(express.static('./public'));

app.use(express.static(__dirname + '/public'));
app.use('/',require('./routes'));

app.listen(port, ()=>{
    console.log(`server is running on port ${port}`);
    
})