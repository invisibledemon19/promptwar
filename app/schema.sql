-- VibeTrack Core Database Schema
-- Optimized for Real-time Telemetry and Spatial Queries

-- Enable PostGIS extension for spatial queries (Mapbox GL JS integration)
CREATE EXTENSION IF NOT EXISTS postgis;

-- Table: stadium_nodes (The physical digital twin markers)
CREATE TABLE stadium_nodes (
    node_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    zone_name VARCHAR(255) NOT NULL,
    lat DOUBLE PRECISION NOT NULL,
    lng DOUBLE PRECISION NOT NULL,
    geom GEOMETRY(Point, 4326) GENERATED ALWAYS AS (ST_SetSRID(ST_MakePoint(lng, lat), 4326)) STORED,
    capacity INT NOT NULL,
    current_occupancy INT DEFAULT 0,
    density FLOAT GENERATED ALWAYS AS (current_occupancy::FLOAT / NULLIF(capacity, 0) * 100) STORED,
    last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- Table: vibe_score (Telemetry from YOLOv11 & Computer Vision)
CREATE TABLE vibe_score (
    vibe_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES stadium_nodes(node_id) ON DELETE CASCADE,
    energy_level FLOAT NOT NULL CHECK (energy_level >= 0 AND energy_level <= 100),
    emotion_tag VARCHAR(50) NOT NULL CHECK (emotion_tag IN ('High Energy', 'Neutral', 'Frustrated', 'Critical')),
    wait_time_estimate_minutes INT DEFAULT 0,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Table: crowd_density (Historical density for GNN / Predictive Analytics)
CREATE TABLE crowd_density (
    record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    node_id UUID REFERENCES stadium_nodes(node_id) ON DELETE CASCADE,
    historical_density FLOAT NOT NULL,
    recorded_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexing for performance
CREATE INDEX idx_stadium_nodes_geom ON stadium_nodes USING GIST (geom);
CREATE INDEX idx_vibe_score_node_id ON vibe_score(node_id);
CREATE INDEX idx_vibe_score_recorded_at ON vibe_score(recorded_at DESC);

-- Supabase Realtime Publication
ALTER PUBLICATION supabase_realtime ADD TABLE stadium_nodes;
ALTER PUBLICATION supabase_realtime ADD TABLE vibe_score;

-- Function: Trigger to auto-update last_updated timestamp
CREATE OR REPLACE FUNCTION update_last_updated_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.last_updated = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_stadium_nodes_modtime
    BEFORE UPDATE ON stadium_nodes
    FOR EACH ROW
    EXECUTE FUNCTION update_last_updated_column();
