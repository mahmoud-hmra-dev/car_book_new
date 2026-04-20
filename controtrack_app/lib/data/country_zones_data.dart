/// Pre-defined country boundary polygons for automatic geofence creation.
///
/// ⚠️  Coordinate order: `latitude longitude` (NOT standard WKT lng/lat).
/// The backend (Traccar proxy) treats the first number as latitude and the
/// second as longitude — confirmed by visual testing.
///
/// Lebanon uses a detailed ~13-point simplified polygon that traces the actual
/// border shape. All other countries use a 5-point bounding-box rectangle
/// (accurate enough for "did the vehicle leave the country?" alerts).
library;

class CountryZone {
  /// English name
  final String nameEn;

  /// Arabic name
  final String nameAr;

  /// Flag emoji
  final String flag;

  /// Geographical region key — matches translation key `region_<region>`
  final String region;

  /// WKT polygon string in **latitude longitude** order per point:
  /// `POLYGON ((lat lng, lat lng, ...))`
  final String wktPolygon;

  /// Centre latitude for map camera
  final double centerLat;

  /// Centre longitude for map camera
  final double centerLng;

  /// Zoom level that shows the full country nicely
  final double zoom;

  /// True when derived from a bounding-box rather than the actual border shape.
  /// Shows an "approximate" badge in the UI.
  final bool isBbox;

  const CountryZone({
    required this.nameEn,
    required this.nameAr,
    required this.flag,
    required this.region,
    required this.wktPolygon,
    required this.centerLat,
    required this.centerLng,
    required this.zoom,
    this.isBbox = true,
  });

  // ─────────────────────────────────────────────────────────── data

  static final List<CountryZone> all = [
    // ── Levant ───────────────────────────────────────────────────────────────

    // Lebanon — detailed 13-point polygon tracing the actual border.
    // Points listed as (latitude longitude):
    //   SW coast Naqoura → S border → E border → NE Hermel
    //   → N border → W Mediterranean coast → close
    const CountryZone(
      nameEn: 'Lebanon',
      nameAr: 'لبنان',
      flag: '🇱🇧',
      region: 'levant',
      centerLat: 33.8547,
      centerLng: 35.8623,
      zoom: 8.0,
      isBbox: false,
      wktPolygon:
          'POLYGON ((33.1050 35.1048, 33.0950 35.4800, 33.2500 35.7200, '
          '33.5200 36.0200, 33.9000 36.5900, 34.2300 36.6300, '
          '34.5100 36.5600, 34.6700 35.9700, 34.6800 35.4800, '
          '34.4900 35.1400, 33.9500 35.0700, 33.5500 35.0500, '
          '33.1050 35.1048))',
    ),

    // Syria — bounding box
    const CountryZone(
      nameEn: 'Syria',
      nameAr: 'سوريا',
      flag: '🇸🇾',
      region: 'levant',
      centerLat: 34.8021,
      centerLng: 38.9968,
      zoom: 6.0,
      wktPolygon:
          'POLYGON ((32.31 35.73, 32.31 42.38, 37.32 42.38, 37.32 35.73, 32.31 35.73))',
    ),

    // Jordan — bounding box
    const CountryZone(
      nameEn: 'Jordan',
      nameAr: 'الأردن',
      flag: '🇯🇴',
      region: 'levant',
      centerLat: 31.2457,
      centerLng: 36.2384,
      zoom: 7.0,
      wktPolygon:
          'POLYGON ((29.18 34.95, 29.18 39.30, 33.37 39.30, 33.37 34.95, 29.18 34.95))',
    ),

    // Palestine (West Bank + Gaza) — bounding box
    const CountryZone(
      nameEn: 'Palestine',
      nameAr: 'فلسطين',
      flag: '🇵🇸',
      region: 'levant',
      centerLat: 31.9522,
      centerLng: 35.2332,
      zoom: 8.5,
      wktPolygon:
          'POLYGON ((31.22 34.89, 31.22 35.90, 32.55 35.90, 32.55 34.89, 31.22 34.89))',
    ),

    // ── Gulf ─────────────────────────────────────────────────────────────────

    // Saudi Arabia — bounding box
    const CountryZone(
      nameEn: 'Saudi Arabia',
      nameAr: 'المملكة العربية السعودية',
      flag: '🇸🇦',
      region: 'gulf',
      centerLat: 23.8859,
      centerLng: 45.0792,
      zoom: 5.0,
      wktPolygon:
          'POLYGON ((16.37 34.50, 16.37 55.67, 32.16 55.67, 32.16 34.50, 16.37 34.50))',
    ),

    // UAE — bounding box
    const CountryZone(
      nameEn: 'UAE',
      nameAr: 'الإمارات العربية المتحدة',
      flag: '🇦🇪',
      region: 'gulf',
      centerLat: 24.4764,
      centerLng: 54.3773,
      zoom: 7.0,
      wktPolygon:
          'POLYGON ((22.63 51.56, 22.63 56.38, 26.07 56.38, 26.07 51.56, 22.63 51.56))',
    ),

    // Kuwait — bounding box
    const CountryZone(
      nameEn: 'Kuwait',
      nameAr: 'الكويت',
      flag: '🇰🇼',
      region: 'gulf',
      centerLat: 29.3117,
      centerLng: 47.4818,
      zoom: 8.0,
      wktPolygon:
          'POLYGON ((28.53 46.56, 28.53 48.42, 30.09 48.42, 30.09 46.56, 28.53 46.56))',
    ),

    // Qatar — bounding box
    const CountryZone(
      nameEn: 'Qatar',
      nameAr: 'قطر',
      flag: '🇶🇦',
      region: 'gulf',
      centerLat: 25.3548,
      centerLng: 51.1839,
      zoom: 8.5,
      wktPolygon:
          'POLYGON ((24.47 50.75, 24.47 51.60, 26.16 51.60, 26.16 50.75, 24.47 50.75))',
    ),

    // Bahrain — bounding box
    const CountryZone(
      nameEn: 'Bahrain',
      nameAr: 'البحرين',
      flag: '🇧🇭',
      region: 'gulf',
      centerLat: 26.0275,
      centerLng: 50.5500,
      zoom: 10.0,
      wktPolygon:
          'POLYGON ((25.79 50.45, 25.79 50.82, 26.27 50.82, 26.27 50.45, 25.79 50.45))',
    ),

    // Oman — bounding box
    const CountryZone(
      nameEn: 'Oman',
      nameAr: 'عُمان',
      flag: '🇴🇲',
      region: 'gulf',
      centerLat: 21.5129,
      centerLng: 55.9233,
      zoom: 6.0,
      wktPolygon:
          'POLYGON ((16.65 51.99, 16.65 59.84, 26.39 59.84, 26.39 51.99, 16.65 51.99))',
    ),

    // ── Middle East ───────────────────────────────────────────────────────────

    // Iraq — bounding box
    const CountryZone(
      nameEn: 'Iraq',
      nameAr: 'العراق',
      flag: '🇮🇶',
      region: 'middle_east',
      centerLat: 33.2232,
      centerLng: 43.6793,
      zoom: 6.0,
      wktPolygon:
          'POLYGON ((29.10 38.79, 29.10 48.57, 37.38 48.57, 37.38 38.79, 29.10 38.79))',
    ),

    // Yemen — bounding box
    const CountryZone(
      nameEn: 'Yemen',
      nameAr: 'اليمن',
      flag: '🇾🇪',
      region: 'middle_east',
      centerLat: 15.5527,
      centerLng: 48.5164,
      zoom: 6.0,
      wktPolygon:
          'POLYGON ((12.11 42.55, 12.11 53.10, 18.99 53.10, 18.99 42.55, 12.11 42.55))',
    ),

    // Turkey — bounding box
    const CountryZone(
      nameEn: 'Turkey',
      nameAr: 'تركيا',
      flag: '🇹🇷',
      region: 'middle_east',
      centerLat: 38.9637,
      centerLng: 35.2433,
      zoom: 5.0,
      wktPolygon:
          'POLYGON ((35.82 25.67, 35.82 44.79, 42.10 44.79, 42.10 25.67, 35.82 25.67))',
    ),

    // Iran — bounding box
    const CountryZone(
      nameEn: 'Iran',
      nameAr: 'إيران',
      flag: '🇮🇷',
      region: 'middle_east',
      centerLat: 32.4279,
      centerLng: 53.6880,
      zoom: 5.0,
      wktPolygon:
          'POLYGON ((25.06 44.03, 25.06 63.33, 39.78 63.33, 39.78 44.03, 25.06 44.03))',
    ),

    // ── North Africa ──────────────────────────────────────────────────────────

    // Egypt — bounding box
    const CountryZone(
      nameEn: 'Egypt',
      nameAr: 'مصر',
      flag: '🇪🇬',
      region: 'north_africa',
      centerLat: 26.8206,
      centerLng: 30.8025,
      zoom: 5.5,
      wktPolygon:
          'POLYGON ((22.00 24.70, 22.00 36.89, 31.67 36.89, 31.67 24.70, 22.00 24.70))',
    ),

    // Libya — bounding box
    const CountryZone(
      nameEn: 'Libya',
      nameAr: 'ليبيا',
      flag: '🇱🇾',
      region: 'north_africa',
      centerLat: 26.3351,
      centerLng: 17.2283,
      zoom: 5.0,
      wktPolygon:
          'POLYGON ((19.50 9.31, 19.50 25.16, 33.17 25.16, 33.17 9.31, 19.50 9.31))',
    ),

    // Tunisia — bounding box
    const CountryZone(
      nameEn: 'Tunisia',
      nameAr: 'تونس',
      flag: '🇹🇳',
      region: 'north_africa',
      centerLat: 33.8869,
      centerLng: 9.5375,
      zoom: 6.5,
      wktPolygon:
          'POLYGON ((30.24 7.52, 30.24 11.59, 37.34 11.59, 37.34 7.52, 30.24 7.52))',
    ),

    // Algeria — bounding box
    const CountryZone(
      nameEn: 'Algeria',
      nameAr: 'الجزائر',
      flag: '🇩🇿',
      region: 'north_africa',
      centerLat: 28.0339,
      centerLng: 1.6596,
      zoom: 5.0,
      wktPolygon:
          'POLYGON ((18.96 -8.68, 18.96 11.99, 37.09 11.99, 37.09 -8.68, 18.96 -8.68))',
    ),

    // Morocco — bounding box
    const CountryZone(
      nameEn: 'Morocco',
      nameAr: 'المغرب',
      flag: '🇲🇦',
      region: 'north_africa',
      centerLat: 31.7917,
      centerLng: -7.0926,
      zoom: 5.5,
      wktPolygon:
          'POLYGON ((27.67 -17.02, 27.67 -1.12, 35.92 -1.12, 35.92 -17.02, 27.67 -17.02))',
    ),

    // Sudan — bounding box
    const CountryZone(
      nameEn: 'Sudan',
      nameAr: 'السودان',
      flag: '🇸🇩',
      region: 'north_africa',
      centerLat: 15.5582,
      centerLng: 32.5599,
      zoom: 5.0,
      wktPolygon:
          'POLYGON ((8.68 21.83, 8.68 38.61, 22.23 38.61, 22.23 21.83, 8.68 21.83))',
    ),
  ];

  /// Returns countries matching the search query (Arabic or English name,
  /// or region key).  Returns [all] when the query is blank.
  static List<CountryZone> search(String query) {
    final q = query.trim().toLowerCase();
    if (q.isEmpty) return all;
    return all
        .where((c) =>
            c.nameEn.toLowerCase().contains(q) ||
            c.nameAr.contains(q) ||
            c.region.contains(q))
        .toList();
  }
}
