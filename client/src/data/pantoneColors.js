// Curated Pantone Textile Color list (TCX system)
// Each entry: [code, name, approx hex for UI display]
export const PANTONE_COLORS = [
  // Whites & Creams
  ['11-0601', 'Bright White', '#FFFFFF'],
  ['11-0602', 'Blanc de Blanc', '#F5F5F0'],
  ['11-0602', 'Snow White', '#FFFAFA'],
  ['11-0907', 'Ivory', '#FFFFF0'],
  ['12-0712', 'Pale Ecru', '#F5EFDC'],
  ['12-0104', 'Whisper White', '#F0EEE9'],
  ['11-4800', 'Optical White', '#F8F8F5'],

  // Yellows
  ['12-0752', 'Buttercup', '#FFD700'],
  ['13-0858', 'Primrose Yellow', '#F6D155'],
  ['14-0846', 'Sunflower', '#FFC72C'],
  ['13-0941', 'Pale Banana', '#FFF0A0'],
  ['13-0746', 'Lemon Curry', '#CDA323'],

  // Oranges
  ['15-1157', 'Flame Orange', '#FF6700'],
  ['15-1157', 'Tangerine', '#F28500'],
  ['16-1358', 'Burnt Orange', '#CC5500'],
  ['14-1231', 'Peach Amber', '#FFDAB9'],
  ['16-1338', 'Apricot', '#FBCEB1'],

  // Pinks
  ['14-1911', 'Seashell Pink', '#FFF5EE'],
  ['13-2010', 'Chalk Pink', '#FFD1DC'],
  ['15-1920', 'Peach Pink', '#FF9AA2'],
  ['16-1723', 'Flamingo Pink', '#FC8EAC'],
  ['17-2034', 'Candy Pink', '#E75480'],
  ['18-2043', 'Hot Pink', '#FF69B4'],
  ['18-2336', 'Magenta Haze', '#B03060'],
  ['14-2808', 'Blush', '#FFB6C1'],
  ['15-2218', 'Pale Blush', '#FFE4E1'],

  // Reds
  ['19-1664', 'Fiesta', '#DC143C'],
  ['18-1660', 'Tomato', '#FF6347'],
  ['19-1557', 'Chili Pepper', '#C21807'],
  ['18-1548', 'Aurora Red', '#B5333E'],
  ['19-1756', 'Salsa', '#B22222'],
  ['18-1631', 'Rose of Sharon', '#9E3043'],
  ['19-1532', 'Brick Red', '#CB4154'],
  ['19-1763', 'True Red', '#BF1932'],

  // Burgundy & Wine
  ['19-1725', 'Burgundy', '#800020'],
  ['19-1620', 'Cabernet', '#6E1423'],
  ['18-1740', 'Marsala', '#955251'],
  ['19-1628', 'Wine Tasting', '#722F37'],
  ['19-1748', 'Pomegranate', '#C0392B'],

  // Purples
  ['17-3628', 'Crocus', '#C9A0DC'],
  ['18-3838', 'Ultra Violet', '#5F4B8B'],
  ['19-3536', 'Deep Lavender', '#9678B6'],
  ['18-3633', 'Aster Purple', '#7B337D'],
  ['19-3542', 'Royal Purple', '#7851A9'],
  ['19-3748', 'Blueprint', '#4B0082'],
  ['16-3810', 'Pastel Lilac', '#D8B4FE'],
  ['17-3612', 'Lavender Mist', '#C4B5FD'],

  // Blues
  ['19-3832', 'Naval', '#000080'],
  ['19-4241', 'Dress Blues', '#1B3A4B'],
  ['18-4051', 'Classic Blue', '#0F4C81'],
  ['17-4041', 'Marina', '#4E86C4'],
  ['14-4318', 'Sky Blue', '#87CEEB'],
  ['19-4150', 'Dark Sapphire', '#082567'],
  ['19-4340', 'Midnight', '#1C1C4E'],
  ['15-3920', 'Baby Blue', '#89CFF0'],
  ['18-4244', 'Cornflower Blue', '#6495ED'],
  ['19-4241', 'Insignia Blue', '#002FA7'],
  ['17-4328', 'Blue Fog', '#738FA7'],

  // Teals & Cyans
  ['17-5126', 'Biscay Bay', '#257B78'],
  ['16-5127', 'Aqua Haze', '#7FFFD4'],
  ['18-5020', 'Deep Teal', '#003C3C'],
  ['15-5519', 'Turquoise', '#40E0D0'],
  ['17-5029', 'Teal', '#008080'],
  ['16-5533', 'Peacock Blue', '#005F69'],

  // Greens
  ['17-0145', 'Foliage', '#50C878'],
  ['15-0545', 'Greenery', '#88B04B'],
  ['19-0230', 'Dark Green', '#006400'],
  ['18-0135', 'Peridot', '#97A510'],
  ['16-0545', 'Jade Lime', '#8DB600'],
  ['17-0230', 'Fern', '#4F7942'],
  ['19-0419', 'Duffel Bag', '#3D4A37'],
  ['14-0232', 'Jade Tint', '#C8E6C9'],
  ['18-0228', 'Greenbriar', '#4A5E52'],
  ['15-0343', 'Lettuce Green', '#A8D5A2'],
  ['17-0535', 'Jade', '#00A693'],

  // Khakis & Olives
  ['16-0632', 'Sand', '#C2B280'],
  ['16-0928', 'Wheat', '#F5DEB3'],
  ['17-1044', 'Khaki', '#C3B091'],
  ['18-0430', 'Avocado', '#568203'],
  ['18-0430', 'Olive Oil', '#6B6A0B'],
  ['19-0417', 'Dark Olive', '#556B2F'],
  ['18-0625', 'Warm Olive', '#7E7B4C'],

  // Browns & Tans
  ['17-1340', 'Almond', '#EFDECD'],
  ['17-1044', 'Camel', '#C19A6B'],
  ['18-1048', 'Tobacco Brown', '#A07850'],
  ['18-1048', 'Caramel', '#C68642'],
  ['19-1217', 'Mocha Bisque', '#7B3F00'],
  ['18-1142', 'Adobe', '#C27651'],
  ['19-1217', 'Chocolate', '#7B3F00'],

  // Greys
  ['11-4800', 'Glacier Grey', '#C0C0C0'],
  ['17-3911', 'Silver', '#ABABAB'],
  ['14-4102', 'Light Grey', '#D3D3D3'],
  ['18-0306', 'Slate Grey', '#708090'],
  ['18-4006', 'Mid Grey', '#9E9E9E'],
  ['19-0203', 'Charcoal', '#36454F'],
  ['19-4004', 'Dark Grey', '#555555'],

  // Blacks
  ['19-0303', 'Jet Black', '#000000'],
  ['19-4005', 'Caviar', '#0A0A0A'],
  ['19-4103', 'Tap Shoe', '#1C1C1C'],

  // Metallics (approximated)
  ['15-0751', 'Gold', '#FFD700'],
  ['16-1324', 'Champagne', '#F7E7CE'],
  ['11-0602', 'Silver', '#C0C0C0'],
  ['17-1044', 'Bronze', '#CD7F32'],
  ['16-0924', 'Rose Gold', '#B76E79'],

  // Off-whites / Naturals
  ['12-0712', 'Off White', '#FAF9F6'],
  ['12-0104', 'Cream', '#FFFDD0'],
  ['13-0905', 'Parchment', '#F1E9D2'],
  ['13-0002', 'Marshmallow', '#EFE7DB'],
];

// Search function - returns top matches for a query string
export function searchPantone(query) {
  if (!query || query.length < 1) return [];
  const q = query.toLowerCase();
  const exact = [];
  const starts = [];
  const contains = [];

  for (const [code, name, hex] of PANTONE_COLORS) {
    const nameLower = name.toLowerCase();
    const codeLower = code.toLowerCase();
    if (nameLower === q || codeLower === q) exact.push({ code, name, hex });
    else if (nameLower.startsWith(q) || codeLower.startsWith(q)) starts.push({ code, name, hex });
    else if (nameLower.includes(q) || codeLower.includes(q)) contains.push({ code, name, hex });
  }

  return [...exact, ...starts, ...contains].slice(0, 12);
}
