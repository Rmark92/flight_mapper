-- In order to re-create the database with this file,
-- you'll need the files 'routes_data_cleaned.csv' and 'airports_data_cleaned.csv'
-- in the working directory

CREATE EXTENSION postgis;

CREATE TABLE master(
  airport character varying(100) NOT NULL,
  city character varying(100) NOT NULL,
  country character varying(100) NOT NULL,
  iata_code character varying(3),
  latitude real NOT NULL,
  longitude real NOT NULL
);

\copy master FROM './airport_data_cleaned.csv' WITH CSV HEADER

ALTER TABLE master ADD COLUMN id serial PRIMARY KEY;

CREATE TABLE countries(
  id serial PRIMARY KEY,
  name character varying(100) UNIQUE NOT NULL
);

CREATE TABLE cities(
  id serial PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  country_id integer NOT NULL REFERENCES countries(id) ON DELETE CASCADE
);

CREATE TABLE airports(
  id serial PRIMARY KEY,
  master_id integer NOT NULL,
  code character varying(3),
  geog geography(Point, 4326),
  name character varying(100) NOT NULL,
  country_id integer REFERENCES countries(id) ON DELETE CASCADE,
  city_id integer REFERENCES cities(id) ON DELETE CASCADE
);

INSERT INTO airports(name, code, master_id, geog)
  (SELECT master.airport,
          master.iata_code,
          master.id,
          ST_GeometryFromText(CONCAT('POINT(', master.longitude, ' ', master.latitude, ')'), 4326)
   FROM master);

INSERT INTO countries(name) (SELECT DISTINCT(country) FROM master);

INSERT INTO cities(name, country_id)
  (SELECT master.city, countries.id
    FROM master INNER JOIN countries ON master.country = countries.name
    GROUP BY countries.id, master.city);

UPDATE airports
  SET country_id = (
    SELECT countries.id
    FROM master INNER JOIN countries ON countries.name = master.country
    WHERE master.id = airports.master_id);

UPDATE airports
  SET city_id = (
    SELECT cities.id
    FROM master INNER JOIN countries ON master.country = countries.name
                INNER JOIN cities ON (countries.id = cities.country_id AND cities.name = master.city)
    WHERE airports.master_id = master.id
  );

-- Fixing incorrect coordinate entries:
UPDATE airports
SET geog = ST_GeometryFromText('POINT(26.3670 -12.1738)', 4326)
WHERE id = 4292;

UPDATE airports
SET geog = ST_GeometryFromText('POINT(145.8586 44.0345)', 4326)
WHERE id = 6261;


ALTER TABLE airports ALTER COLUMN city_id SET NOT NULL;

ALTER TABLE airports ALTER COLUMN country_id SET NOT NULL;

ALTER TABLE airports DROP COLUMN master_id;

DELETE FROM cities WHERE name = '';

DELETE FROM airports WHERE code = '';

DROP TABLE master;

CREATE TABLE routes_master(
  a_code character varying(3) NOT NULL,
  b_code character varying(3) NOT NULL
);

\copy routes_master FROM './routes_data_cleaned.csv' WITH CSV

CREATE TABLE routes(
  id serial PRIMARY KEY,
  source_id integer REFERENCES airports(id) ON DELETE CASCADE,
  destination_id integer REFERENCES airports(id) ON DELETE CASCADE,
  distance numeric(13, 2),
  UNIQUE(source_id, destination_id),
  CHECK(distance >= 0.00)
);

INSERT INTO routes(source_id, destination_id) (
  SELECT a.id, b.id
  FROM airports a, airports b
  WHERE EXISTS (
    SELECT 1 FROM routes_master
    WHERE a.code = routes_master.a_code AND b.code = routes_master.b_code
  )
);

DROP TABLE routes_master;

UPDATE routes
SET distance = ST_Distance(
  (SELECT geog FROM airports WHERE routes.source_id = airports.id),
  (SELECT geog FROM airports WHERE routes.destination_id = airports.id)
);

DELETE FROM airports
WHERE NOT EXISTS (
  SELECT 1
  FROM routes
  WHERE routes.source_id = airports.id OR routes.destination_id = airports.id);

CREATE TABLE users(
  id serial PRIMARY KEY,
  name character varying(30) UNIQUE,
  password_hsh text,
  created_on timestamp NOT NULL DEFAULT NOW(),
  temp_user boolean NOT NULL DEFAULT TRUE,
  CHECK(((password_hsh IS NOT NULL) AND (name IS NOT NULL)) OR temp_user)
);

CREATE TABLE trips(
  id serial PRIMARY KEY,
  created_on timestamp NOT NULL DEFAULT NOW(),
  user_id integer REFERENCES users(id) ON DELETE CASCADE,
  route_id integer REFERENCES routes(id) ON DELETE CASCADE,
  UNIQUE(user_id, route_id)
);
