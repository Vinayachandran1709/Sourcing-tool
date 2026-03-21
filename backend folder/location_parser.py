"""
US Location Parser for TalentBox
Normalizes GitHub location strings to standard US city names.
"""

# Mapping of location variations to standard city names
US_CITY_NORMALIZER = {
    # San Francisco
    "sf": "san francisco",
    "san fran": "san francisco",
    "bay area": "san francisco",
    "silicon valley": "san francisco",
    "san francisco bay": "san francisco",
    "san francisco, ca": "san francisco",
    "san francisco, california": "san francisco",
    "sf bay area": "san francisco",
    "sf, ca": "san francisco",
    "palo alto": "san francisco",
    "mountain view": "san francisco",
    "sunnyvale": "san francisco",
    "cupertino": "san francisco",
    "san jose": "san francisco",
    "oakland": "san francisco",
    "berkeley": "san francisco",
    "redwood city": "san francisco",
    "menlo park": "san francisco",
    "fremont": "san francisco",
    "santa clara": "san francisco",

    # New York
    "nyc": "new york",
    "new york city": "new york",
    "manhattan": "new york",
    "brooklyn": "new york",
    "queens": "new york",
    "bronx": "new york",
    "new york, ny": "new york",
    "new york, new york": "new york",
    "ny": "new york",
    "jersey city": "new york",
    "hoboken": "new york",

    # Seattle
    "seattle, wa": "seattle",
    "seattle, washington": "seattle",
    "bellevue": "seattle",
    "redmond": "seattle",
    "kirkland": "seattle",
    "tacoma": "seattle",

    # Austin
    "austin, tx": "austin",
    "austin, texas": "austin",
    "atx": "austin",

    # Los Angeles
    "la": "los angeles",
    "los angeles, ca": "los angeles",
    "los angeles, california": "los angeles",
    "santa monica": "los angeles",
    "venice": "los angeles",
    "hollywood": "los angeles",
    "pasadena": "los angeles",
    "long beach": "los angeles",
    "burbank": "los angeles",
    "culver city": "los angeles",
    "irvine": "los angeles",

    # Boston
    "boston, ma": "boston",
    "boston, massachusetts": "boston",
    "cambridge": "boston",
    "cambridge, ma": "boston",
    "somerville": "boston",

    # Chicago
    "chicago, il": "chicago",
    "chicago, illinois": "chicago",
    "chi": "chicago",

    # Denver
    "denver, co": "denver",
    "denver, colorado": "denver",

    # Boulder (now its own city)
    "boulder, co": "boulder",
    "boulder, colorado": "boulder",

    # Atlanta
    "atlanta, ga": "atlanta",
    "atlanta, georgia": "atlanta",
    "atl": "atlanta",

    # San Diego
    "san diego, ca": "san diego",
    "san diego, california": "san diego",

    # New city variations
    "dc": "washington dc",
    "washington": "washington dc",
    "washington, dc": "washington dc",
    "d.c.": "washington dc",
    "philly": "philadelphia",
    "philadelphia, pa": "philadelphia",
    "dallas, tx": "dallas",
    "houston, tx": "houston",
    "miami, fl": "miami",
    "portland, or": "portland",
    "phoenix, az": "phoenix",
    "detroit, mi": "detroit",
    "minneapolis, mn": "minneapolis",
    "twin cities": "minneapolis",
    "research triangle": "raleigh",
    "rdu": "raleigh",
    "slc": "salt lake city",
    "tampa bay": "tampa",
    "dfw": "dallas",
    "dmv": "washington dc",
}

# Map cities to states
US_CITY_TO_STATE = {
    # Tier 1
    "san francisco": "California",
    "new york": "New York",
    "seattle": "Washington",
    "austin": "Texas",
    "los angeles": "California",
    "boston": "Massachusetts",
    "chicago": "Illinois",
    "denver": "Colorado",
    "atlanta": "Georgia",
    "san diego": "California",

    # Tier 2
    "portland": "Oregon",
    "phoenix": "Arizona",
    "dallas": "Texas",
    "houston": "Texas",
    "miami": "Florida",
    "washington dc": "District of Columbia",
    "philadelphia": "Pennsylvania",
    "minneapolis": "Minnesota",
    "detroit": "Michigan",
    "charlotte": "North Carolina",
    "nashville": "Tennessee",
    "raleigh": "North Carolina",
    "salt lake city": "Utah",
    "pittsburgh": "Pennsylvania",
    "columbus": "Ohio",
    "indianapolis": "Indiana",
    "kansas city": "Missouri",
    "tampa": "Florida",
    "orlando": "Florida",
    "san antonio": "Texas",

    # Tier 3
    "st louis": "Missouri",
    "baltimore": "Maryland",
    "cleveland": "Ohio",
    "cincinnati": "Ohio",
    "milwaukee": "Wisconsin",
    "sacramento": "California",
    "las vegas": "Nevada",
    "new orleans": "Louisiana",
    "jacksonville": "Florida",
    "richmond": "Virginia",
    "hartford": "Connecticut",
    "providence": "Rhode Island",
    "buffalo": "New York",
    "rochester": "New York",
    "madison": "Wisconsin",
    "ann arbor": "Michigan",
    "boulder": "Colorado",
    "provo": "Utah",
    "boise": "Idaho",
    "albuquerque": "New Mexico",
}

# All target cities
US_TARGET_CITIES = [
    # Tier 1: Major Tech Hubs
    "san francisco",
    "new york",
    "seattle",
    "austin",
    "los angeles",
    "boston",
    "chicago",
    "denver",
    "atlanta",
    "san diego",

    # Tier 2: Growing Tech Cities
    "portland",
    "phoenix",
    "dallas",
    "houston",
    "miami",
    "washington dc",
    "philadelphia",
    "minneapolis",
    "detroit",
    "charlotte",
    "nashville",
    "raleigh",
    "salt lake city",
    "pittsburgh",
    "columbus",
    "indianapolis",
    "kansas city",
    "tampa",
    "orlando",
    "san antonio",

    # Tier 3: Secondary Markets
    "st louis",
    "baltimore",
    "cleveland",
    "cincinnati",
    "milwaukee",
    "sacramento",
    "las vegas",
    "new orleans",
    "jacksonville",
    "richmond",
    "hartford",
    "providence",
    "buffalo",
    "rochester",
    "madison",
    "ann arbor",
    "boulder",
    "provo",
    "boise",
    "albuquerque",
]

# State abbreviations
STATE_ABBREVIATIONS = {
    "ca": "California",
    "california": "California",
    "ny": "New York",
    "new york": "New York",
    "wa": "Washington",
    "washington": "Washington",
    "tx": "Texas",
    "texas": "Texas",
    "ma": "Massachusetts",
    "massachusetts": "Massachusetts",
    "il": "Illinois",
    "illinois": "Illinois",
    "co": "Colorado",
    "colorado": "Colorado",
    "ga": "Georgia",
    "georgia": "Georgia",
    "or": "Oregon",
    "oregon": "Oregon",
    "az": "Arizona",
    "arizona": "Arizona",
    "fl": "Florida",
    "florida": "Florida",
    "pa": "Pennsylvania",
    "pennsylvania": "Pennsylvania",
    "mn": "Minnesota",
    "minnesota": "Minnesota",
    "mi": "Michigan",
    "michigan": "Michigan",
    "nc": "North Carolina",
    "north carolina": "North Carolina",
    "tn": "Tennessee",
    "tennessee": "Tennessee",
    "ut": "Utah",
    "utah": "Utah",
    "oh": "Ohio",
    "ohio": "Ohio",
    "in": "Indiana",
    "indiana": "Indiana",
    "mo": "Missouri",
    "missouri": "Missouri",
    "md": "Maryland",
    "maryland": "Maryland",
    "wi": "Wisconsin",
    "wisconsin": "Wisconsin",
    "nv": "Nevada",
    "nevada": "Nevada",
    "la": "Louisiana",
    "louisiana": "Louisiana",
    "va": "Virginia",
    "virginia": "Virginia",
    "ct": "Connecticut",
    "connecticut": "Connecticut",
    "ri": "Rhode Island",
    "rhode island": "Rhode Island",
    "id": "Idaho",
    "idaho": "Idaho",
    "nm": "New Mexico",
    "new mexico": "New Mexico",
    "dc": "District of Columbia",
    "district of columbia": "District of Columbia",
}


def normalize_city(location_raw: str) -> str | None:
    """
    Normalize a raw location string to a standard city name.

    Args:
        location_raw: Raw location string from GitHub (e.g., "SF Bay Area", "NYC")

    Returns:
        Normalized city name (e.g., "san francisco") or None if not recognized
    """
    if not location_raw:
        return None

    # Lowercase and strip
    location = location_raw.lower().strip()

    # Direct match in normalizer
    if location in US_CITY_NORMALIZER:
        return US_CITY_NORMALIZER[location]

    # Check if any target city is in the string
    for city in US_TARGET_CITIES:
        if city in location:
            return city

    # Check for city variations at start of string (e.g., "San Francisco, USA")
    for variation, city in US_CITY_NORMALIZER.items():
        if location.startswith(variation):
            return city

    return None


def parse_us_location(location_raw: str) -> dict | None:
    """
    Parse a raw location string into structured US location data.

    Args:
        location_raw: Raw location string from GitHub

    Returns:
        Dictionary with city, state, country, raw or None if not US location
    """
    if not location_raw:
        return None

    city = normalize_city(location_raw)

    if city:
        return {
            "city": city,
            "state": US_CITY_TO_STATE.get(city, "Unknown"),
            "country": "United States",
            "raw": location_raw,
        }

    # Check if it mentions USA/United States but unknown city
    location_lower = location_raw.lower()
    us_indicators = ["usa", "united states", "u.s.", "u.s.a"]

    for indicator in us_indicators:
        if indicator in location_lower:
            return {
                "city": None,
                "state": None,
                "country": "United States",
                "raw": location_raw,
            }

    return None


def is_us_location(location_raw: str) -> bool:
    """Check if a location string appears to be in the United States."""
    return parse_us_location(location_raw) is not None


def get_search_query_for_city(city: str) -> str:
    """Get the GitHub search query location string for a city."""
    # GitHub search works best with simple city names
    return city.replace(" ", "+")
