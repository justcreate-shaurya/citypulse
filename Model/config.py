# Mohali-specific baseline configurations
# Based on CPCB data and local urban patterns

MOHALI_CONFIG = {
    'zones': {
        'commercial': {
            'morning': {'noise': 55, 'temp': 24, 'aqi': 80, 'crowd': 8},
            'afternoon': {'noise': 65, 'temp': 32, 'aqi': 95, 'crowd': 15},
            'evening': {'noise': 70, 'temp': 28, 'aqi': 90, 'crowd': 20},
            'night': {'noise': 45, 'temp': 22, 'aqi': 70, 'crowd': 3},
        },
        'residential': {
            'morning': {'noise': 45, 'temp': 23, 'aqi': 75, 'crowd': 5},
            'afternoon': {'noise': 50, 'temp': 31, 'aqi': 85, 'crowd': 8},
            'evening': {'noise': 55, 'temp': 27, 'aqi': 80, 'crowd': 12},
            'night': {'noise': 35, 'temp': 21, 'aqi': 65, 'crowd': 2},
        },
        'mixed': {
            'morning': {'noise': 50, 'temp': 24, 'aqi': 78, 'crowd': 6},
            'afternoon': {'noise': 58, 'temp': 32, 'aqi': 90, 'crowd': 12},
            'evening': {'noise': 65, 'temp': 28, 'aqi': 85, 'crowd': 18},
            'night': {'noise': 40, 'temp': 21, 'aqi': 68, 'crowd': 3},
        },
    },
    'seasonal_adjustments': {
        'summer': {'temp': 1.2, 'aqi': 1.1},
        'monsoon': {'temp': 0.85, 'aqi': 0.8},
        'winter': {'temp': 0.7, 'aqi': 1.3},  # Winter has worse AQI due to crop burning
        'spring': {'temp': 1.0, 'aqi': 1.0},
    },
    'thresholds': {
        'noise_critical': 85,
        'temp_critical': 38,
        'aqi_critical': 150,
        'crowd_critical': 25,
        'stress_elevated': 55,
        'stress_critical': 80,
    },
    'nodes': {
        'CP-MOH-01': {'zone': 'commercial', 'name': 'IT Park Sector 70'},
        'CP-MOH-02': {'zone': 'residential', 'name': 'Phase 11'},
        'CP-MOH-03': {'zone': 'mixed', 'name': 'Phase 7'},
        'CP-MOH-04': {'zone': 'residential', 'name': 'Sector 77'},
        'CP-MOH-05': {'zone': 'commercial', 'name': 'Phase 3B2'},
    }
}

def get_time_slot(hour):
    if 6 <= hour < 12:
        return 'morning'
    elif 12 <= hour < 17:
        return 'afternoon'
    elif 17 <= hour < 22:
        return 'evening'
    return 'night'

def get_season(month):
    if month in [4, 5, 6]:
        return 'summer'
    elif month in [7, 8, 9]:
        return 'monsoon'
    elif month in [10, 11, 12, 1]:
        return 'winter'
    return 'spring'

def get_baseline(node_id, hour, month=None):
    node_info = MOHALI_CONFIG['nodes'].get(node_id, {'zone': 'mixed'})
    zone = node_info['zone']
    time_slot = get_time_slot(hour)
    
    baseline = MOHALI_CONFIG['zones'][zone][time_slot].copy()
    
    if month:
        season = get_season(month)
        adj = MOHALI_CONFIG['seasonal_adjustments'][season]
        baseline['temp'] *= adj.get('temp', 1.0)
        baseline['aqi'] *= adj.get('aqi', 1.0)
    
    return baseline
