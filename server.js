'use strict';

require('dotenv').config();


const express=require('express');
const superagent=require('superagent');
const pg =require('pg');
const methodOverride=require('method-override');


const app=express();
const PORT =process.env.PORT;

app.use(express.urlencoded({ extended: true }));

// Set the view engine for server-side templating
app.set('view engine', 'ejs');
app.use(express.static('./public'));
app.use(methodOverride('_method'));

app.get('/',renderHomePage)
app.post('/search',getdata)


function Flight(data){
this.flight_date=(data.flight_date)?data.flight_date:'no available flight date';
this.flight_status=(data.flight_status)?data.flight_status:'no available flight status';
this.departure=(data.departure)?data.departure:'no available departure';
this.arrival=(data.arrival)?data.arrival:'no available arrival';
this.airline=(data.airline.name)?data.airline.name:'no available airline name';
this.flight=(data.flight.number)?data.flight.number:'no available flight number';
}

function renderHomePage(request,response){
    response.render('pages/')
}

function getdata(request,response){
    console.log(request.body);
    let departure;
    let arrival;
    
    const airlineName=request.body.airline;
    const flightNumber=(request.body.flightnumber)?request.body.flightnumber:' ';
    const key=process.env.FLIGHT_KEY;
    let url=`http://api.aviationstack.com/v1/flights?access_key=${key}&airline_name=${airlineName}`

    if(request.body.departure && request.body.arrival){
        console.log('inside if');
        const iata=require('./data/iata.json');
        iata.forEach(element => {
            if(element.city===request.body.departure ||element.state===request.body.departure ){
                departure  =  element.code;
                console.log('departure',departure);
            }
            if(element.city===request.body.arrival||element.state===request.body.arrival){
                arrival  =  element.code;
                console.log('arrival',arrival);
            }
        });      
        url=`${url}&dep_iata=${departure}&arr_iata=${arrival}`;
        console.log(url);       
    }
    if(request.body.flightnumber){
        console.log('inside second if');
        url=`${url}&flight_number=${flightNumber}`;
        console.log('url',url)
    }
    url=`${url}&limit=5`;
    console.log('last url////////////////////////////',url)
    superagent.get(url).then(apireponse=>{
      console.log(apireponse.body.data);
    //   console.log(apireponse.body.data[0].departure);
  }).catch((err)=> {
    console.log(err);
  });
   
    
//     let departure=handleIata(request.body.departure);
//     let arrival=handleIata(request.body.arrival);
// console.log('departure',departure);
// console.log('arrival',arrival);
  

  
  
}
// function handleIata(city){
//     const iata=require('./data/iata.json');
//     // let currentCities=[];
//     iata.forEach(element => {
//         if(city===element.city){
//             return element.code;
//         }
//     });


// }


app.listen(PORT, () => {console.log(`Listening to Port ${PORT}`);});