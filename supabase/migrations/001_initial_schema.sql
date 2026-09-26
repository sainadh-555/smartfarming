-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. ZONES (Fields)
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id TEXT UNIQUE NOT NULL, -- e.g., 'ZONE-A'
    name TEXT NOT NULL,
    crop_type TEXT NOT NULL,
    area TEXT NOT NULL,
    status TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. SENSOR READINGS
CREATE TABLE sensor_readings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id TEXT REFERENCES zones(zone_id) ON DELETE CASCADE,
    soil_moisture DECIMAL NOT NULL,
    soil_temperature DECIMAL NOT NULL,
    air_temperature DECIMAL NOT NULL,
    humidity DECIMAL NOT NULL,
    light_intensity INTEGER NOT NULL,
    rainfall DECIMAL NOT NULL,
    plant_health_score INTEGER NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. ALERTS
CREATE TABLE alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id TEXT REFERENCES zones(zone_id) ON DELETE CASCADE,
    zone_name TEXT NOT NULL,
    severity TEXT NOT NULL,
    type TEXT NOT NULL,
    message TEXT NOT NULL,
    resolved BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. IRRIGATION EVENTS
CREATE TABLE irrigation_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    zone_id TEXT REFERENCES zones(zone_id) ON DELETE CASCADE,
    start_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    duration_minutes INTEGER,
    status TEXT NOT NULL,
    trigger_type TEXT NOT NULL
);

-- Indexes for fast querying
CREATE INDEX idx_sensor_readings_zone ON sensor_readings(zone_id, recorded_at DESC);
CREATE INDEX idx_alerts_zone ON alerts(zone_id, resolved);
CREATE INDEX idx_irrigation_zone ON irrigation_events(zone_id, start_time DESC);

-- Trigger to update 'updated_at' on zones
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
   NEW.updated_at = NOW();
   RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_zones_updated_at
BEFORE UPDATE ON zones
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Seed Data (Matches the current MVP initial state)
INSERT INTO zones (zone_id, name, crop_type, area, status) VALUES 
('ZONE-A', 'North Field', 'Corn', '2.5 Acres', 'Active'),
('ZONE-B', 'South Field', 'Soybeans', '3.0 Acres', 'Active'),
('ZONE-C', 'East Orchard', 'Apples', '1.5 Acres', 'Active');

INSERT INTO sensor_readings (zone_id, soil_moisture, soil_temperature, air_temperature, humidity, light_intensity, rainfall, plant_health_score, recorded_at) VALUES 
('ZONE-A', 42.5, 18.2, 24.5, 65.0, 750, 0, 85, NOW()),
('ZONE-B', 38.0, 19.1, 25.1, 62.0, 810, 0, 78, NOW()),
('ZONE-C', 55.2, 17.5, 23.8, 70.0, 680, 5, 92, NOW());
