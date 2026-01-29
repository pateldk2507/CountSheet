const express = require('express');
const bodyParser = require('body-parser');
const app = express();

app.use(bodyParser.json());

const port = 3000 || process.env.PORT;

app.set('view engine', 'ejs');
app.use(express.static('./public'));

app.use(express.static(__dirname + '/public'));
app.use('/',require('./routes'));
  
app.listen(port, async function () {
  console.log(`Dashboard app listening on port ${port}!`);

});