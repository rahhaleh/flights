DROP TABLE  IF EXISTS airlines; 
DROP TABLE  IF EXISTS reviews;
DROP TABLE  IF EXISTS flights_info;

CREATE TABLE IF NOT EXISTS airlines (
    id SERIAL PRIMARY KEY,
    airline varchar(255),
    rate NUMERIC 
);

CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    flight_id INT ,
    user_name varchar(255),
    comment TEXT ,
    flight_rate NUMERIC
);
CREATE TABLE IF NOT EXISTS flights_info (
    id SERIAL PRIMARY KEY ,
    flight_num NUMERIC ,
    airline varchar(255),
    departure varchar (255),
    arrival varchar (255) ,
    flight_date date ,
    flight_status varchar(255)
);

/*ALTER TABLE flights_info  ADD CONSTRAINT fk_airline FOREIGN KEY (airline) REFERENCES airlines(id);*/
ALTER TABLE reviews  ADD CONSTRAINT fk_reviews FOREIGN KEY (flight_id) REFERENCES flights_info(id);
ALTER TABLE reviews ADD UNIQUE(flight_id);






