import React, { useState, useMemo, useEffect } from 'react';

// ============================================================================
// BAZA MIAST I REGIONÓW W NIEMCZECH (DE) I HOLANDII (NL)
// Umożliwia szybkie wyszukiwanie i dokładne pozycjonowanie na mapie bez API
// ============================================================================
const DE_NL_CITIES = [
  // Holandia (NL)
  { name: 'Amsterdam', country: 'NL', lat: 52.3676, lng: 4.9041 },
  { name: 'Rotterdam', country: 'NL', lat: 51.9244, lng: 4.4777 },
  { name: 'Utrecht', country: 'NL', lat: 52.0907, lng: 5.1214 },
  { name: 'Eindhoven', country: 'NL', lat: 51.4416, lng: 5.4697 },
  { name: 'Venlo', country: 'NL', lat: 51.3704, lng: 6.1724 },
  { name: 'Groningen', country: 'NL', lat: 53.2194, lng: 6.5665 },
  { name: 'Arnhem', country: 'NL', lat: 51.9851, lng: 5.8987 },
  { name: 'Breda', country: 'NL', lat: 51.5719, lng: 4.7683 },
  { name: 'Enschede', country: 'NL', lat: 52.2215, lng: 6.8937 },
  { name: 'Maastricht', country: 'NL', lat: 50.8514, lng: 5.6910 },
  // Niemcy (DE)
  { name: 'Dortmund (NRW)', country: 'DE', lat: 51.5136, lng: 7.4653 },
  { name: 'Düsseldorf', country: 'DE', lat: 51.2277, lng: 6.7735 },
  { name: 'Köln (Kolonia)', country: 'DE', lat: 50.9375, lng: 6.9603 },
  { name: 'Essen', country: 'DE', lat: 51.4556, lng: 7.0116 },
  { name: 'Münster', country: 'DE', lat: 51.9607, lng: 7.6261 },
  { name: 'Hamburg', country: 'DE', lat: 53.5511, lng: 9.9937 },
  { name: 'Bremen', country: 'DE', lat: 53.0793, lng: 8.8017 },
  { name: 'Hannover', country: 'DE', lat: 52.3759, lng: 9.7320 },
  { name: 'Berlin', country: 'DE', lat: 52.5200, lng: 13.4050 },
  { name: 'Frankfurt am Main', country: 'DE', lat: 50.1109, lng: 8.6821 },
  { name: 'Stuttgart', country: 'DE', lat: 48.7758, lng: 9.1829 },
  { name: 'München (Monachium)', country: 'DE', lat: 48.1351, lng: 11.5820 },
  { name: 'Nürnberg', country: 'DE', lat: 49.4521, lng: 11.0767 },
  { name: 'Leipzig', country: 'DE', lat: 51.3397, lng: 12.3731 },
  { name: 'Dresden', country: 'DE', lat: 51.0504, lng: 13.7373 },
  { name: 'Kassel', country: 'DE', lat: 51.3127, lng: 9.4797 },
  { name: 'Aachen', country: 'DE', lat: 50.7753, lng: 6.0839 },
  { name: 'Osnabrück', country: 'DE', lat: 52.2799, lng: 8.0472 },
];

// Zakres geograficzny mapy interaktywnej DE + NL
const MAP_BOUNDS = {
  minLng: 3.1,
  maxLng: 15.3,
  minLat: 47.1,
  maxLat: 55.1,
};

// Przeliczenie współrzędnych GPS na pozycję % na mapie wektorowej DE/NL
function latLngToPercent(lat, lng) {
  const x = ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) * 100;
  const y = ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) * 100;
  return {
    x: Math.max(2, Math.min(98, x)),
    y: Math.max(2, Math.min(98, y)),
  };
}

// Przeliczenie kliknięcia % na mapie na przybliżone współrzędne GPS
function percentToLatLng(xPercent, yPercent) {
  const lng = MAP_BOUNDS.minLng + (xPercent / 100) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  const lat = MAP_BOUNDS.maxLat - (yPercent / 100) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  };
}

// Znalezienie najbliższego znanego miasta dla podpowiedzi nazwy po kliknięciu w mapę
function findNearestCity(lat, lng) {
  let best = DE_NL_CITIES[0];
  let bestDist = Infinity;
  for (const c of DE_NL_CITIES) {
    const d = Math.hypot(c.lat - lat, c.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = c;
    }
  }
  return bestDist < 1.2 ? `Okolice: ${best.name}` : `Punkt (${lat.toFixed(2)}, ${lng.toFixed(2)})`;
}

// Polskie nazwy miesięcy do zestawień miesięcznych i rocznych
const MONTH_NAMES_PL = [
  { value: '01', label: 'Styczeń' },
  { value: '02', label: 'Luty' },
  { value: '03', label: 'Marzec' },
  { value: '04', label: 'Kwiecień' },
  { value: '05', label: 'Maj' },
  { value: '06', label: 'Czerwiec' },
  { value: '07', label: 'Lipiec' },
  { value: '08', label: 'Sierpień' },
  { value: '09', label: 'Wrzesień' },
  { value: '10', label: 'Październik' },
  { value: '11', label: 'Listopad' },
  { value: '12', label: 'Grudzień' },
];

// Formatowanie klucza "YYYY-MM" na czytelną nazwę np. "Listopad 2026"
function formatMonthKeyPL(monthKey) {
  if (!monthKey || monthKey.length < 7) return 'Brak daty';
  const [year, month] = monthKey.split('-');
  const found = MONTH_NAMES_PL.find((m) => m.value === month);
  return found ? `${found.label} ${year}` : monthKey;
}

// Sprawdzenie, czy data "YYYY-MM-DD" pasuje do wybranego filtra roku i miesiąca
function matchesPeriod(dateStr, selectedYear, selectedMonth) {
  if (!dateStr) return selectedYear === 'ALL' && selectedMonth === 'ALL';
  const [y, m] = dateStr.split('-');
  if (selectedYear !== 'ALL' && y !== selectedYear) return false;
  if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;
  return true;
}

const STORAGE_KEY = 'audio_klasyki_data_v1';

function loadSavedData() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ============================================================================
// WBUDOWANE IKONY SVG (Zero zewnętrznych zależności - działa w każdym edytorze)
// ============================================================================
const Icon = ({ name, className = 'w-5 h-5' }) => {
  const paths = {
    speaker: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="14" r="4" />
        <line x1="12" y1="6" x2="12.01" y2="6" strokeWidth="2.5" />
      </>
    ),
    map: (
      <>
        <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6" />
        <line x1="8" y1="2" x2="8" y2="18" />
        <line x1="16" y1="6" x2="16" y2="22" />
      </>
    ),
    wallet: (
      <>
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12c0 1.1.9 2 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
      </>
    ),
    megaphone: (
      <>
        <path d="m3 11 18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </>
    ),
    pin: (
      <>
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    truck: (
      <>
        <rect x="1" y="3" width="15" height="13" rx="1" />
        <polygon points="16 8 20 8 23 11 23 16 16 16 16 8" />
        <circle cx="5.5" cy="18.5" r="2.5" />
        <circle cx="18.5" cy="18.5" r="2.5" />
      </>
    ),
    plus: (
      <>
        <line x1="12" y1="5" x2="12" y2="19" />
        <line x1="5" y1="12" x2="19" y2="12" />
      </>
    ),
    trash: (
      <>
        <polyline points="3 6 5 6 21 6" />
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      </>
    ),
    external: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    check: <polyline points="20 6 9 17 4 12" />,
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    trophy: (
      <>
        <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
        <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
        <path d="M4 22h16" />
        <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
        <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
        <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
      </>
    ),
    route: (
      <>
        <circle cx="6" cy="19" r="3" />
        <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
        <circle cx="18" cy="5" r="3" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {paths[name] || null}
    </svg>
  );
};

// ============================================================================
// GŁÓWNY KOMPONENT APLIKACJI: AUDIO KLASYKI
// ============================================================================
export default function App() {
  // Automatyczne doładowanie stylów Tailwind CSS (działa w każdym projekcie)
  useEffect(() => {
    if (!document.getElementById('tailwind-cdn')) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  // Aktywna zakładka
  const [activeTab, setActiveTab] = useState('inventory');

  // Powiadomienia (zamiast alert())
  const [toast, setToast] = useState(null);
  const showToast = (text, type = 'success') => {
    setToast({ text, type });
    setTimeout(() => setToast(null), 3200);
  };

  // Potwierdzenie usunięcia (zamiast confirm())
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // Modal eksportu / importu kopii zapasowej
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [importText, setImportText] = useState('');

  const savedData = useMemo(() => loadSavedData(), []);

  // ==========================================================================
  // 1. STAN MAGAZYNU I FINANSÓW (KOLUMNY, WZMACNIACZE, INNE)
  // ==========================================================================
  const [items, setItems] = useState(
    savedData?.items || [
      {
        id: 'inv-1',
        name: 'Kolumny Canton Karat 930',
        category: 'Kolumny',
        buyPrice: 650,
        repairCost: 120,
        sellPrice: 1350,
        note: 'Wymiana kondensatorów zwrotnicy, stan bdb',
        date: '2026-11-08',
        sellDate: '2026-11-11',
      },
      {
        id: 'inv-2',
        name: 'Wzmacniacz Pioneer SA-7800',
        category: 'Wzmacniacze',
        buyPrice: 1100,
        repairCost: 250,
        sellPrice: 2150,
        note: 'Czyszczenie potencjometrów + podświetlenie wskaźników',
        date: '2026-11-03',
        sellDate: '2026-11-10',
      },
      {
        id: 'inv-3',
        name: 'Kolumny JBL L50 (para)',
        category: 'Kolumny',
        buyPrice: 1400,
        repairCost: 180,
        sellPrice: 0, // 0 oznacza "Na stanie / w trakcie sprzedaży"
        note: 'Nowe zawieszenia piankowe, wystawione na OLX/FB',
        date: '2026-11-11',
        sellDate: '',
      },
      {
        id: 'inv-4',
        name: 'Kolumny Quadral Phonologue Shogun',
        category: 'Kolumny',
        buyPrice: 900,
        repairCost: 150,
        sellPrice: 1850,
        note: 'Regeneracja zawieszeń, odbiór z Dortmundu',
        date: '2026-10-14',
        sellDate: '2026-10-25',
      },
      {
        id: 'inv-5',
        name: 'Amplituner Marantz 2238B',
        category: 'Wzmacniacze',
        buyPrice: 1250,
        repairCost: 200,
        sellPrice: 2300,
        note: 'Wymiana żarówek na ciepłe LED + regulacja',
        date: '2026-09-18',
        sellDate: '2026-10-04',
      },
    ]
  );

  const [categoryFilter, setCategoryFilter] = useState('Wszystkie');
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [inventoryView, setInventoryView] = useState('list'); // 'list' | 'breakdown'
  const [sellingItemId, setSellingItemId] = useState(null);
  const [quickSellPrice, setQuickSellPrice] = useState('');

  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Kolumny',
    buyPrice: '',
    repairCost: '',
    sellPrice: '',
    date: new Date().toISOString().slice(0, 10),
    note: '',
  });

  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) {
      showToast('Wpisz nazwę sprzętu (np. model kolumn lub wzmacniacza).', 'error');
      return;
    }
    const entryDate = newItem.date || new Date().toISOString().slice(0, 10);
    const sPrice = Number(newItem.sellPrice) || 0;
    const entry = {
      id: 'inv-' + Date.now(),
      name: newItem.name.trim(),
      category: newItem.category,
      buyPrice: Number(newItem.buyPrice) || 0,
      repairCost: Number(newItem.repairCost) || 0,
      sellPrice: sPrice,
      note: newItem.note.trim(),
      date: entryDate,
      sellDate: sPrice > 0 ? entryDate : '',
    };
    setItems([entry, ...items]);
    setNewItem({
      name: '',
      category: 'Kolumny',
      buyPrice: '',
      repairCost: '',
      sellPrice: '',
      date: new Date().toISOString().slice(0, 10),
      note: '',
    });
    showToast('Dodano sprzęt do magazynu Audio Klasyki!');
  };

  const handleConfirmQuickSell = (id) => {
    const price = Number(quickSellPrice);
    if (!price || price <= 0) {
      showToast('Podaj prawidłową cenę sprzedaży.', 'error');
      return;
    }
    const today = new Date().toISOString().slice(0, 10);
    setItems(
      items.map((it) =>
        it.id === id ? { ...it, sellPrice: price, sellDate: it.sellDate || today } : it
      )
    );
    setSellingItemId(null);
    setQuickSellPrice('');
    showToast('Zapisano sprzedaż i zaktualizowano zysk!');
  };

  // Dostępne lata w bazie danych (do filtra rocznego)
  const availableYears = useMemo(() => {
    const yearsSet = new Set([new Date().getFullYear().toString()]);
    items.forEach((it) => {
      if (it.date && it.date.length >= 4) yearsSet.add(it.date.slice(0, 4));
      if (it.sellDate && it.sellDate.length >= 4) yearsSet.add(it.sellDate.slice(0, 4));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [items]);

  // Podsumowanie finansowe sprzętu (całościowe oraz dla wybranego Roku / Miesiąca)
  const inventoryStats = useMemo(() => {
    let totalRevenue = 0;
    let soldCost = 0;
    let periodBuyTotal = 0;
    let periodRepairTotal = 0;
    let periodBoughtCount = 0;
    let stockValue = 0;
    let soldCount = 0;
    let inStockCount = 0;

    items.forEach((it) => {
      const buy = Number(it.buyPrice) || 0;
      const repair = Number(it.repairCost) || 0;
      const sell = Number(it.sellPrice) || 0;
      const totalCost = buy + repair;
      const effectiveSellDate = it.sellDate || it.date;

      // Zakupy i naprawy w wybranym okresie (wg daty zakupu)
      if (matchesPeriod(it.date, selectedYear, selectedMonth)) {
        periodBuyTotal += buy;
        periodRepairTotal += repair;
        periodBoughtCount += 1;
      }

      // Sprzedaż i zysk w wybranym okresie (wg daty sprzedaży)
      if (sell > 0) {
        if (matchesPeriod(effectiveSellDate, selectedYear, selectedMonth)) {
          totalRevenue += sell;
          soldCost += totalCost;
          soldCount += 1;
        }
      } else {
        if (matchesPeriod(it.date, selectedYear, selectedMonth)) {
          stockValue += totalCost;
          inStockCount += 1;
        }
      }
    });

    return {
      totalRevenue,
      soldCost,
      netProfit: totalRevenue - soldCost,
      periodBuyTotal,
      periodRepairTotal,
      periodBoughtCount,
      stockValue,
      soldCount,
      inStockCount,
    };
  }, [items, selectedYear, selectedMonth]);

  // Całościowy zysk ze sprzętu (niezależnie od filtra miesiąca, do paska w nagłówku)
  const allTimeEquipmentProfit = useMemo(() => {
    return items.reduce((acc, it) => {
      if ((Number(it.sellPrice) || 0) > 0) {
        return acc + (Number(it.sellPrice) - (Number(it.buyPrice) || 0) - (Number(it.repairCost) || 0));
      }
      return acc;
    }, 0);
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter((it) => {
      if (categoryFilter !== 'Wszystkie' && it.category !== categoryFilter) return false;
      const effectiveSellDate = it.sellPrice > 0 ? it.sellDate || it.date : it.date;
      const matchBuyDate = matchesPeriod(it.date, selectedYear, selectedMonth);
      const matchSellDate = it.sellPrice > 0 && matchesPeriod(effectiveSellDate, selectedYear, selectedMonth);
      return matchBuyDate || matchSellDate;
    });
  }, [items, categoryFilter, selectedYear, selectedMonth]);

  // ==========================================================================
  // 2. STAN MAPY DE / NL ORAZ INTEGRACJA Z MAPAMI GOOGLE
  // ==========================================================================
  const [mapViewMode, setMapViewMode] = useState('interactive'); // 'interactive' | 'google'
  const [selectedPinId, setSelectedPinId] = useState('pin-1');
  const [citySearch, setCitySearch] = useState('');
  const [isSearchingCity, setIsSearchingCity] = useState(false);

  const [pins, setPins] = useState([
    {
      id: 'pin-1',
      type: 'pickup', // 'pickup' (Odbiór towaru) | 'driver' (Kierowca)
      title: 'Dortmund - Kolumny Quadral + wzmacniacz Sony',
      address: 'Dortmund, Niemcy',
      lat: 51.5136,
      lng: 7.4653,
      note: 'Odbiór po 16:00, płatność gotówką 220 EUR',
      done: false,
    },
    {
      id: 'pin-2',
      type: 'pickup',
      title: 'Eindhoven - Zestaw Technics + gramofon',
      address: 'Eindhoven, Holandia',
      lat: 51.4416,
      lng: 5.4697,
      note: 'Spakowane w kartony, kontakt przez WhatsApp',
      done: false,
    },
    {
      id: 'pin-3',
      type: 'driver',
      title: 'Kierowca Marek (Bus Sprinter)',
      address: 'Venlo / granica NL-DE',
      lat: 51.3704,
      lng: 6.1724,
      note: 'W trasie po NRW i Holandii, wolne miejsce na 6 par kolumn',
      done: false,
    },
  ]);

  const [newPin, setNewPin] = useState({
    type: 'pickup',
    title: '',
    address: 'Dortmund (NRW)',
    lat: 51.5136,
    lng: 7.4653,
    note: '',
  });

  // Kliknięcie bezpośrednio w interaktywną mapę Niemiec i Holandii
  const handleMapClick = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const xPercent = ((e.clientX - rect.left) / rect.width) * 100;
    const yPercent = ((e.clientY - rect.top) / rect.height) * 100;
    const coords = percentToLatLng(xPercent, yPercent);
    const suggestedPlace = findNearestCity(coords.lat, coords.lng);

    setNewPin((prev) => ({
      ...prev,
      lat: coords.lat,
      lng: coords.lng,
      address: suggestedPlace,
    }));
    showToast(`Zaznaczono punkt na mapie (${suggestedPlace}). Uzupełnij opis i zapisz.`);
  };

  // Wybór miasta z listy lub wyszukanie adresu w DE / NL
  const handleSelectPresetCity = (cityObj) => {
    setNewPin((prev) => ({
      ...prev,
      address: `${cityObj.name} (${cityObj.country})`,
      lat: cityObj.lat,
      lng: cityObj.lng,
    }));
    showToast(`Wybrano lokalizację: ${cityObj.name}`);
  };

  // Wyszukiwanie dowolnego miasta/kodu pocztowego w DE/NL (z lokalną bazą + OpenStreetMap fallback)
  const handleSearchLocation = async (e) => {
    e.preventDefault();
    const query = citySearch.trim();
    if (!query) return;

    // 1. Najpierw sprawdź lokalną listę miast DE/NL (działa natychmiast i offline)
    const localMatch = DE_NL_CITIES.find((c) =>
      c.name.toLowerCase().includes(query.toLowerCase())
    );
    if (localMatch) {
      handleSelectPresetCity(localMatch);
      return;
    }

    // 2. Jeśli to dokładny adres lub kod pocztowy (np. "44135 Dortmund" lub "5911 Venlo"), sprawdź Nominatim
    setIsSearchingCity(true);
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=de,nl&q=${encodeURIComponent(
        query
      )}`;
      const res = await fetch(url);
      const data = await res.json();
      if (data && data.length > 0) {
        const hit = data[0];
        const lat = Number(parseFloat(hit.lat).toFixed(4));
        const lng = Number(parseFloat(hit.lon).toFixed(4));
        const shortLabel = hit.display_name.split(',').slice(0, 2).join(', ');
        setNewPin((prev) => ({
          ...prev,
          address: shortLabel,
          lat,
          lng,
        }));
        showToast(`Znaleziono w DE/NL: ${shortLabel}`);
      } else {
        // Nawet jeśli geokoder nie zwróci współrzędnych, zapisujemy dokładny adres dla Map Google!
        setNewPin((prev) => ({
          ...prev,
          address: query,
        }));
        showToast(`Ustawiono adres "${query}" – gotowy do otwarcia w Mapach Google.`);
      }
    } catch {
      setNewPin((prev) => ({
        ...prev,
        address: query,
      }));
      showToast(`Zapisano adres "${query}" dla nawigacji Google Maps.`);
    } finally {
      setIsSearchingCity(false);
    }
  };

  const handleAddPin = (e) => {
    e.preventDefault();
    if (!newPin.title.trim()) {
      showToast('Wpisz opis (np. jakie kolumny do odbioru lub imię kierowcy).', 'error');
      return;
    }
    const created = {
      id: 'pin-' + Date.now(),
      type: newPin.type,
      title: newPin.title.trim(),
      address: newPin.address.trim() || `${newPin.lat}, ${newPin.lng}`,
      lat: Number(newPin.lat) || 51.5,
      lng: Number(newPin.lng) || 7.5,
      note: newPin.note.trim(),
      done: false,
    };
    setPins([created, ...pins]);
    setSelectedPinId(created.id);
    setNewPin((prev) => ({ ...prev, title: '', note: '' }));
    showToast('Punkt dodany na mapę i połączony z Mapami Google!');
  };

  // Kopiowanie linku Google Maps do schowka (bezpieczne w iframe i na telefonie)
  const copyTextToClipboard = (text, message = 'Skopiowano link do Map Google!') => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      showToast(message);
    } catch {
      showToast('Nie udało się skopiować automatycznie.', 'error');
    }
  };

  // Generowanie linku do aplikacji Mapy Google dla pojedynczego punktu
  const getGoogleMapsUrl = (pin) => {
    const query =
      pin.address && !pin.address.startsWith('Punkt (') && !pin.address.startsWith('Okolice:')
        ? `${pin.address} (${pin.lat},${pin.lng})`
        : `${pin.lat},${pin.lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  };

  // Generowanie wielopunktowej trasy wszystkich aktywnych odbiorów w Mapach Google!
  const getMultiStopRouteUrl = () => {
    const activePickups = pins.filter((p) => p.type === 'pickup' && !p.done);
    if (activePickups.length === 0) return null;
    if (activePickups.length === 1) {
      return `https://www.google.com/maps/dir/?api=1&destination=${activePickups[0].lat},${activePickups[0].lng}`;
    }
    const destination = activePickups[activePickups.length - 1];
    const waypoints = activePickups
      .slice(0, -1)
      .map((p) => `${p.lat},${p.lng}`)
      .join('|');
    return `https://www.google.com/maps/dir/?api=1&destination=${destination.lat},${destination.lng}&waypoints=${encodeURIComponent(
      waypoints
    )}`;
  };

  const selectedPin = pins.find((p) => p.id === selectedPinId) || pins[0];
  const googleEmbedSrc = selectedPin
    ? `https://maps.google.com/maps?q=${selectedPin.lat},${selectedPin.lng}&z=9&output=embed`
    : `https://maps.google.com/maps?q=51.5,8.0&z=6&output=embed`;

  // ==========================================================================
  // 3. STAN PRZYCHODÓW INNYCH (FACEBOOK, OLX, TRANSPORT ITD.)
  // ==========================================================================
  const [otherIncomes, setOtherIncomes] = useState(
    savedData?.otherIncomes || [
      {
        id: 'oth-1',
        title: 'Kable głośnikowe + maskownice (Grupa FB Audio Vintage)',
        source: 'Facebook',
        amount: 340,
        cost: 40,
        date: '2026-11-07',
      },
      {
        id: 'oth-2',
        title: 'Przywóz paczki po drodze z Dortmundu dla znajomego',
        source: 'Transport / Przywóz',
        amount: 250,
        cost: 0,
        date: '2026-10-19',
      },
    ]
  );

  const [newOther, setNewOther] = useState({
    title: '',
    source: 'Facebook',
    amount: '',
    cost: '',
  });

  const handleAddOtherIncome = (e) => {
    e.preventDefault();
    if (!newOther.title.trim() || !newOther.amount) {
      showToast('Podaj opis oraz kwotę przychodu.', 'error');
      return;
    }
    const entry = {
      id: 'oth-' + Date.now(),
      title: newOther.title.trim(),
      source: newOther.source,
      amount: Number(newOther.amount) || 0,
      cost: Number(newOther.cost) || 0,
      date: new Date().toISOString().slice(0, 10),
    };
    setOtherIncomes([entry, ...otherIncomes]);
    setNewOther({ title: '', source: 'Facebook', amount: '', cost: '' });
    showToast('Dodano wpis do Przychodów Innych!');
  };

  const otherIncomeStats = useMemo(() => {
    const revenue = otherIncomes.reduce((acc, x) => acc + (Number(x.amount) || 0), 0);
    const costs = otherIncomes.reduce((acc, x) => acc + (Number(x.cost) || 0), 0);
    return { revenue, costs, net: revenue - costs };
  }, [otherIncomes]);

  // ==========================================================================
  // 4. STAN SKUTECZNOŚCI REKLAM (PORTALE I LICZBA ODEZWANYCH OSÓB)
  // ==========================================================================
  const [ads, setAds] = useState(
    savedData?.ads || [
      {
        id: 'ad-1',
        title: 'Ogłoszenie: Kolumny vintage z Niemiec (karuzela zdjęć)',
        portal: 'Facebook',
        leads: 28,
        adCost: 60,
        date: '2026-11-05',
      },
      {
        id: 'ad-2',
        title: 'Wyróżnione ogłoszenie wzmacniaczy stereo',
        portal: 'OLX',
        leads: 19,
        adCost: 35,
        date: '2026-11-06',
      },
      {
        id: 'ad-3',
        title: 'Post na grupach Hi-Fi Polska / Klasyki Audio',
        portal: 'Grupy Facebook',
        leads: 34,
        adCost: 0,
        date: '2026-11-09',
      },
    ]
  );

  // Automatyczny zapis wszystkich zmian w pamięci przeglądarki
  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ items, pins, otherIncomes, ads })
      );
    } catch {
      // Ignoruj błędy zapisu w trybie prywatnym
    }
  }, [items, pins, otherIncomes, ads]);

  // Rozbicie finansowe na MIESIĄCE oraz LATA (Kupno, Naprawy, Sprzedaż, Zysk, Przychody inne)
  const { monthlyBreakdown, yearlyBreakdown } = useMemo(() => {
    const monthsMap = {};
    const yearsMap = {};

    const ensureMonth = (mKey) => {
      if (!monthsMap[mKey]) {
        monthsMap[mKey] = {
          monthKey: mKey,
          year: mKey.slice(0, 4),
          buyTotal: 0,
          repairTotal: 0,
          boughtCount: 0,
          sellTotal: 0,
          soldCostTotal: 0,
          soldCount: 0,
          otherNet: 0,
        };
      }
      return monthsMap[mKey];
    };

    const ensureYear = (yKey) => {
      if (!yearsMap[yKey]) {
        yearsMap[yKey] = {
          year: yKey,
          buyTotal: 0,
          repairTotal: 0,
          boughtCount: 0,
          sellTotal: 0,
          soldCostTotal: 0,
          soldCount: 0,
          otherNet: 0,
        };
      }
      return yearsMap[yKey];
    };

    items.forEach((it) => {
      const buy = Number(it.buyPrice) || 0;
      const repair = Number(it.repairCost) || 0;
      const sell = Number(it.sellPrice) || 0;

      if (it.date && it.date.length >= 7) {
        const bMonth = it.date.slice(0, 7);
        const bYear = it.date.slice(0, 4);
        const mObj = ensureMonth(bMonth);
        const yObj = ensureYear(bYear);
        mObj.buyTotal += buy;
        mObj.repairTotal += repair;
        mObj.boughtCount += 1;
        yObj.buyTotal += buy;
        yObj.repairTotal += repair;
        yObj.boughtCount += 1;
      }

      if (sell > 0) {
        const sDate = it.sellDate || it.date;
        if (sDate && sDate.length >= 7) {
          const sMonth = sDate.slice(0, 7);
          const sYear = sDate.slice(0, 4);
          const mObj = ensureMonth(sMonth);
          const yObj = ensureYear(sYear);
          mObj.sellTotal += sell;
          mObj.soldCostTotal += buy + repair;
          mObj.soldCount += 1;
          yObj.sellTotal += sell;
          yObj.soldCostTotal += buy + repair;
          yObj.soldCount += 1;
        }
      }
    });

    otherIncomes.forEach((oth) => {
      if (oth.date && oth.date.length >= 7) {
        const net = (Number(oth.amount) || 0) - (Number(oth.cost) || 0);
        const oMonth = oth.date.slice(0, 7);
        const oYear = oth.date.slice(0, 4);
        ensureMonth(oMonth).otherNet += net;
        ensureYear(oYear).otherNet += net;
      }
    });

    const sortedMonths = Object.values(monthsMap)
      .filter((m) => (selectedYear === 'ALL' ? true : m.year === selectedYear))
      .sort((a, b) => b.monthKey.localeCompare(a.monthKey))
      .map((m) => {
        const equipmentProfit = m.sellTotal - m.soldCostTotal;
        const cashflowBalance = m.sellTotal - (m.buyTotal + m.repairTotal);
        return {
          ...m,
          equipmentProfit,
          totalProfit: equipmentProfit + m.otherNet,
          cashflowBalance,
        };
      });

    const sortedYears = Object.values(yearsMap)
      .sort((a, b) => b.year.localeCompare(a.year))
      .map((y) => {
        const equipmentProfit = y.sellTotal - y.soldCostTotal;
        const cashflowBalance = y.sellTotal - (y.buyTotal + y.repairTotal);
        return {
          ...y,
          equipmentProfit,
          totalProfit: equipmentProfit + y.otherNet,
          cashflowBalance,
        };
      });

    return { monthlyBreakdown: sortedMonths, yearlyBreakdown: sortedYears };
  }, [items, otherIncomes, selectedYear]);

  const [newAd, setNewAd] = useState({
    title: '',
    portal: 'Facebook',
    leads: '',
    adCost: '',
  });

  const handleAddAd = (e) => {
    e.preventDefault();
    if (!newAd.title.trim()) {
      showToast('Wpisz nazwę reklamy lub ogłoszenia.', 'error');
      return;
    }
    const entry = {
      id: 'ad-' + Date.now(),
      title: newAd.title.trim(),
      portal: newAd.portal,
      leads: Number(newAd.leads) || 0,
      adCost: Number(newAd.adCost) || 0,
      date: new Date().toISOString().slice(0, 10),
    };
    setAds([entry, ...ads]);
    setNewAd({ title: '', portal: 'Facebook', leads: '', adCost: '' });
    showToast('Dodano reklamę do statystyk!');
  };

  const updateAdLeads = (id, delta) => {
    setAds(
      ads.map((ad) =>
        ad.id === id ? { ...ad, leads: Math.max(0, (Number(ad.leads) || 0) + delta) } : ad
      )
    );
  };

  // Ranking reklam i portali
  const adAnalytics = useMemo(() => {
    if (ads.length === 0) {
      return { bestAd: null, bestPortal: null, totalLeads: 0, portalRanking: [] };
    }
    const sortedAds = [...ads].sort((a, b) => b.leads - a.leads);
    const bestAd = sortedAds[0];

    const byPortal = {};
    let totalLeads = 0;
    ads.forEach((ad) => {
      const count = Number(ad.leads) || 0;
      totalLeads += count;
      byPortal[ad.portal] = (byPortal[ad.portal] || 0) + count;
    });

    const portalRanking = Object.entries(byPortal)
      .map(([portal, count]) => ({ portal, count }))
      .sort((a, b) => b.count - a.count);

    return {
      bestAd,
      bestPortal: portalRanking[0] || null,
      totalLeads,
      portalRanking,
    };
  }, [ads]);

  // ==========================================================================
  // EKSPORT DO EXCELA (CSV) ORAZ KOPIA ZAPASOWA JSON (KOMPUTER <-> TELEFON)
  // ==========================================================================
  const handleExportCSV = () => {
    const rows = [
      [
        'Kategoria',
        'Nazwa',
        'Kupno (PLN)',
        'Naprawa (PLN)',
        'Sprzedaz (PLN)',
        'Zysk (PLN)',
        'Status',
        'Data zakupu',
        'Data sprzedazy',
        'Uwagi',
      ],
      ...items.map((it) => {
        const profit = it.sellPrice > 0 ? it.sellPrice - it.buyPrice - it.repairCost : 0;
        return [
          it.category,
          `"${it.name.replace(/"/g, '""')}"`,
          it.buyPrice,
          it.repairCost,
          it.sellPrice,
          profit,
          it.sellPrice > 0 ? 'Sprzedane' : 'Na stanie',
          it.date,
          it.sellPrice > 0 ? it.sellDate || it.date : '',
          `"${(it.note || '').replace(/"/g, '""')}"`,
        ];
      }),
      [],
      ['--- PODSUMOWANIE MIESIECZNE ---'],
      [
        'Miesiac',
        'Kupno (PLN)',
        'Naprawy (PLN)',
        'Sprzedaz sprzetu (PLN)',
        'Zysk ze sprzetu (PLN)',
        'Przychody inne netto (PLN)',
        'Laczny zysk miesiaca (PLN)',
      ],
      ...monthlyBreakdown.map((m) => [
        formatMonthKeyPL(m.monthKey),
        m.buyTotal,
        m.repairTotal,
        m.sellTotal,
        m.equipmentProfit,
        m.otherNet,
        m.totalProfit,
      ]),
    ];
    const csvContent = '\uFEFF' + rows.map((r) => r.join(';')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Audio-Klasyki-Raport-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Pobrano raport z rozbiciem miesięcznym do Excela (CSV)!');
  };

  const getFullBackupJson = () =>
    JSON.stringify({ items, pins, otherIncomes, ads }, null, 2);

  const handleImportBackup = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed.items)) setItems(parsed.items);
      if (Array.isArray(parsed.pins)) setPins(parsed.pins);
      if (Array.isArray(parsed.otherIncomes)) setOtherIncomes(parsed.otherIncomes);
      if (Array.isArray(parsed.ads)) setAds(parsed.ads);
      setImportText('');
      setShowBackupModal(false);
      showToast('Wczytano wszystkie dane z kopii zapasowej!');
    } catch {
      showToast('Nieprawidłowy format danych kopii zapasowej.', 'error');
    }
  };

  // Łączny zysk ze wszystkich źródeł (Sprzęt + Przychody inne)
  const totalCombinedProfit = allTimeEquipmentProfit + otherIncomeStats.net;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-24 md:pb-10">
      {/* POWIADOMIENIE TOAST */}
      {toast && (
        <div
          className={`fixed bottom-20 md:bottom-6 right-4 left-4 md:left-auto z-50 px-4 py-3 rounded-xl shadow-2xl border text-sm font-medium flex items-center gap-2 transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500 text-rose-100'
              : 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
          }`}
        >
          <Icon name="check" className="w-4 h-4 shrink-0" />
          <span>{toast.text}</span>
        </div>
      )}

      {/* GÓRNY NAGŁÓWEK APLIKACJI */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 py-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
              <Icon name="speaker" className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold tracking-tight text-white flex items-center gap-2">
                Audio Klasyki
                <span className="text-[11px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  DE / NL / PL
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Magazyn audio, logistyka odbiorów Google Maps oraz analiza reklam
              </p>
            </div>
          </div>

          {/* Szybki wskaźnik łącznego zysku + przyciski kopii zapasowej */}
          <div className="flex items-center gap-2 sm:gap-3">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">Łączny zysk netto</div>
              <div
                className={`text-sm sm:text-base font-bold ${
                  totalCombinedProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {totalCombinedProfit >= 0 ? '+' : ''}
                {totalCombinedProfit.toLocaleString('pl-PL')} zł
              </div>
            </div>

            <button
              onClick={handleExportCSV}
              title="Pobierz tabelę do Excela (CSV)"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Icon name="download" className="w-4 h-4 text-amber-400" />
              <span className="hidden md:inline">Excel (CSV)</span>
            </button>

            <button
              onClick={() => setShowBackupModal(true)}
              title="Przenieś dane między komputerem a telefonem"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Icon name="copy" className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">Kopia / Telefon</span>
            </button>
          </div>
        </div>

        {/* NAWIGACJA ZAKŁADEK (DESKTOP) */}
        <nav className="hidden md:block border-t border-slate-800/80 bg-slate-900/60">
          <div className="max-w-7xl mx-auto px-4 flex gap-2 py-2">
            {[
              { id: 'inventory', label: 'Finanse i Magazyn', icon: 'speaker' },
              { id: 'map', label: 'Mapa DE / NL i Mapy Google', icon: 'map' },
              { id: 'otherIncome', label: 'Przychody Inne (FB / OLX)', icon: 'wallet' },
              { id: 'ads', label: 'Skuteczność Reklam', icon: 'megaphone' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium flex items-center gap-2 transition ${
                    active
                      ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon name={tab.icon} className="w-4 h-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* DOLNY PASEK NAWIGACJI NA TELEFONIE (MOBILE-FIRST) */}
      <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-slate-900/95 backdrop-blur border-t border-slate-800 grid grid-cols-4 gap-1 px-1.5 py-1.5">
        {[
          { id: 'inventory', label: 'Magazyn', icon: 'speaker' },
          { id: 'map', label: 'Mapa DE/NL', icon: 'map' },
          { id: 'otherIncome', label: 'Inne (FB)', icon: 'wallet' },
          { id: 'ads', label: 'Reklamy', icon: 'megaphone' },
        ].map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 rounded-xl flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition ${
                active
                  ? 'bg-amber-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon name={tab.icon} className="w-5 h-5" />
              <span className="truncate max-w-full">{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <main className="max-w-7xl mx-auto px-4 pt-5 space-y-6">
        {/* ====================================================================
            ZAKŁADKA 1: FINANSE I MAGAZYN (KOLUMNY, WZMACNIACZE, INNE)
           ==================================================================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-6">
            {/* PASEK FILTRU OKRESU (ROK / MIESIĄC) ORAZ PRZEŁĄCZNIK ZESTAWIENIA */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 mr-1">
                  Okres rozliczeniowy:
                </span>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Wszystkie lata</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr}>
                      Rok {yr}
                    </option>
                  ))}
                </select>

                <select
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(e.target.value)}
                  className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm font-medium text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Wszystkie miesiące</option>
                  {MONTH_NAMES_PL.map((m) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>

                {(selectedYear !== 'ALL' || selectedMonth !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedYear('ALL');
                      setSelectedMonth('ALL');
                    }}
                    className="px-2.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300"
                  >
                    Wyczyść filtr
                  </button>
                )}
              </div>

              {/* PRZEŁĄCZNIK: LISTA SPRZĘTU VS ROZBICIE NA MIESIĄCE I LATA */}
              <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800 self-start md:self-auto">
                <button
                  type="button"
                  onClick={() => setInventoryView('list')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    inventoryView === 'list'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Lista sprzętu ({filteredItems.length})
                </button>
                <button
                  type="button"
                  onClick={() => setInventoryView('breakdown')}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition ${
                    inventoryView === 'breakdown'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  Rozbicie: Miesiące i Lata
                </button>
              </div>
            </div>

            {/* KARTY PODSUMOWANIA FINANSOWEGO DLA WYBRANEGO OKRESU */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Sprzedaż (przychód)</div>
                <div className="text-lg sm:text-2xl font-bold text-white mt-1">
                  {inventoryStats.totalRevenue.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Sprzedane: {inventoryStats.soldCount} szt.
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Kupno sprzętu</div>
                <div className="text-lg sm:text-2xl font-bold text-amber-400 mt-1">
                  {inventoryStats.periodBuyTotal.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Kupione: {inventoryStats.periodBoughtCount} szt.
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Koszty napraw</div>
                <div className="text-lg sm:text-2xl font-bold text-orange-400 mt-1">
                  {inventoryStats.periodRepairTotal.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-xs text-slate-500 mt-1">Części i serwis</div>
              </div>

              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4">
                <div className="text-xs text-emerald-400 font-medium">Zysk na czysto (sprzęt)</div>
                <div
                  className={`text-lg sm:text-2xl font-bold mt-1 ${
                    inventoryStats.netProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {inventoryStats.netProfit >= 0 ? '+' : ''}
                  {inventoryStats.netProfit.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-xs text-slate-500 mt-1">Ze sprzedanych w okresie</div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 col-span-2 sm:col-span-1">
                <div className="text-xs text-slate-400">Zamrożone na stanie</div>
                <div className="text-lg sm:text-2xl font-bold text-sky-400 mt-1">
                  {inventoryStats.stockValue.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-xs text-slate-500 mt-1">
                  Czeka na klienta: {inventoryStats.inStockCount} szt.
                </div>
              </div>
            </div>

            {/* WIDOK ROZBICIA NA MIESIĄCE I LATA */}
            {inventoryView === 'breakdown' ? (
              <div className="space-y-6">
                {/* 1. PODSUMOWANIE ROCZNE */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-slate-800 flex items-center justify-between">
                    <div>
                      <h3 className="text-base font-bold text-white">Podsumowanie Roczne</h3>
                      <p className="text-xs text-slate-400">
                        Zestawienie kupna, napraw, sprzedaży i łącznego zysku rok po roku
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                          <th className="py-3 px-4">Rok</th>
                          <th className="py-3 px-3 text-right">Kupno sprzętu</th>
                          <th className="py-3 px-3 text-right">Naprawy</th>
                          <th className="py-3 px-3 text-right">Sprzedaż sprzętu</th>
                          <th className="py-3 px-3 text-right">Zysk ze sprzętu</th>
                          <th className="py-3 px-3 text-right">Inne (FB/OLX)</th>
                          <th className="py-3 px-4 text-right">Łączny zysk roku</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-sm">
                        {yearlyBreakdown.map((yr) => (
                          <tr key={yr.year} className="hover:bg-slate-800/40">
                            <td className="py-3.5 px-4 font-bold text-white">
                              Rok {yr.year}
                              <div className="text-[11px] font-normal text-slate-400">
                                Kupiono: {yr.boughtCount} szt. • Sprzedano: {yr.soldCount} szt.
                              </div>
                            </td>
                            <td className="py-3.5 px-3 text-right text-amber-400 font-medium whitespace-nowrap">
                              {yr.buyTotal.toLocaleString('pl-PL')} zł
                            </td>
                            <td className="py-3.5 px-3 text-right text-orange-400 whitespace-nowrap">
                              {yr.repairTotal.toLocaleString('pl-PL')} zł
                            </td>
                            <td className="py-3.5 px-3 text-right text-white font-semibold whitespace-nowrap">
                              {yr.sellTotal.toLocaleString('pl-PL')} zł
                            </td>
                            <td
                              className={`py-3.5 px-3 text-right font-semibold whitespace-nowrap ${
                                yr.equipmentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {yr.equipmentProfit >= 0 ? '+' : ''}
                              {yr.equipmentProfit.toLocaleString('pl-PL')} zł
                            </td>
                            <td className="py-3.5 px-3 text-right text-sky-400 whitespace-nowrap">
                              {yr.otherNet >= 0 ? '+' : ''}
                              {yr.otherNet.toLocaleString('pl-PL')} zł
                            </td>
                            <td
                              className={`py-3.5 px-4 text-right font-bold text-base whitespace-nowrap ${
                                yr.totalProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                              }`}
                            >
                              {yr.totalProfit >= 0 ? '+' : ''}
                              {yr.totalProfit.toLocaleString('pl-PL')} zł
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* 2. ROZBICIE MIESIĘCZNE (MIESIĄC PO MIESIĄCU) */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="px-4 py-3.5 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <h3 className="text-base font-bold text-white">
                        Rozbicie na Miesiące {selectedYear !== 'ALL' ? `(${selectedYear})` : ''}
                      </h3>
                      <p className="text-xs text-slate-400">
                        Kliknij dowolny miesiąc, aby wyświetlić listę sprzętu z tego okresu
                      </p>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                          <th className="py-3 px-4">Miesiąc i rok</th>
                          <th className="py-3 px-3 text-right">Kupno</th>
                          <th className="py-3 px-3 text-right">Naprawy</th>
                          <th className="py-3 px-3 text-right">Sprzedaż</th>
                          <th className="py-3 px-3 text-right">Zysk ze sprzedaży</th>
                          <th className="py-3 px-3 text-right">Inne (FB/OLX)</th>
                          <th className="py-3 px-4 text-right">Bilans gotówki</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-sm">
                        {monthlyBreakdown.map((m) => {
                          const [yr, mo] = m.monthKey.split('-');
                          return (
                            <tr
                              key={m.monthKey}
                              onClick={() => {
                                setSelectedYear(yr);
                                setSelectedMonth(mo);
                                setInventoryView('list');
                              }}
                              className="hover:bg-slate-800/60 cursor-pointer transition"
                            >
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white">
                                  {formatMonthKeyPL(m.monthKey)}
                                </div>
                                <div className="text-[11px] text-slate-400">
                                  Kupiono: {m.boughtCount} szt. • Sprzedano: {m.soldCount} szt.
                                </div>
                              </td>
                              <td className="py-3.5 px-3 text-right text-amber-400 font-medium whitespace-nowrap">
                                {m.buyTotal.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="py-3.5 px-3 text-right text-orange-400 whitespace-nowrap">
                                {m.repairTotal.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="py-3.5 px-3 text-right text-white font-semibold whitespace-nowrap">
                                {m.sellTotal.toLocaleString('pl-PL')} zł
                              </td>
                              <td
                                className={`py-3.5 px-3 text-right font-bold whitespace-nowrap ${
                                  m.equipmentProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'
                                }`}
                              >
                                {m.equipmentProfit >= 0 ? '+' : ''}
                                {m.equipmentProfit.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="py-3.5 px-3 text-right text-sky-400 whitespace-nowrap">
                                {m.otherNet >= 0 ? '+' : ''}
                                {m.otherNet.toLocaleString('pl-PL')} zł
                              </td>
                              <td
                                className={`py-3.5 px-4 text-right font-medium whitespace-nowrap ${
                                  m.cashflowBalance >= 0 ? 'text-emerald-300' : 'text-slate-400'
                                }`}
                                title="Sprzedaż w miesiącu minus zakupy i naprawy w miesiącu"
                              >
                                {m.cashflowBalance >= 0 ? '+' : ''}
                                {m.cashflowBalance.toLocaleString('pl-PL')} zł
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* FORMULARZ DODAWANIA NOWEGO SPRZĘTU */}
                <form
                  onSubmit={handleAddItem}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
                >
                  <div className="flex items-center justify-between">
                    <h2 className="text-base font-semibold text-white flex items-center gap-2">
                      <Icon name="plus" className="w-5 h-5 text-amber-400" />
                      Dodaj kupiony sprzęt (Kolumny / Wzmacniacz / Inne)
                    </h2>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
                    <div className="sm:col-span-2">
                      <label className="block text-xs text-slate-400 mb-1">Nazwa / Model sprzętu *</label>
                      <input
                        type="text"
                        placeholder="np. Kolumny Technics SB-7000"
                        value={newItem.name}
                        onChange={(e) => setNewItem({ ...newItem, name: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Kategoria</label>
                      <select
                        value={newItem.category}
                        onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      >
                        <option value="Kolumny">Kolumny</option>
                        <option value="Wzmacniacze">Wzmacniacze</option>
                        <option value="Inne">Inne</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Kupno (zł)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newItem.buyPrice}
                        onChange={(e) => setNewItem({ ...newItem, buyPrice: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Naprawa (zł)</label>
                      <input
                        type="number"
                        min="0"
                        placeholder="0"
                        value={newItem.repairCost}
                        onChange={(e) => setNewItem({ ...newItem, repairCost: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">
                        Sprzedaż (zł) <span className="text-slate-500">(opcjonalnie)</span>
                      </label>
                      <input
                        type="number"
                        min="0"
                        placeholder="Na stanie"
                        value={newItem.sellPrice}
                        onChange={(e) => setNewItem({ ...newItem, sellPrice: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Data</label>
                      <input
                        type="date"
                        value={newItem.date}
                        onChange={(e) => setNewItem({ ...newItem, date: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="text"
                      placeholder="Uwagi (np. co naprawiono, stan wizualny, skąd przywiezione)..."
                      value={newItem.note}
                      onChange={(e) => setNewItem({ ...newItem, note: e.target.value })}
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm flex items-center justify-center gap-2 transition shrink-0"
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      Zapisz w tabeli
                    </button>
                  </div>
                </form>

                {/* FILTRY KATEGORII */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex flex-wrap gap-2">
                    {['Wszystkie', 'Kolumny', 'Wzmacniacze', 'Inne'].map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setCategoryFilter(cat)}
                        className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition ${
                          categoryFilter === cat
                            ? 'bg-slate-100 text-slate-950 font-semibold'
                            : 'bg-slate-900 text-slate-300 border border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                  <div className="text-xs text-slate-400">
                    Wyświetlono: <strong className="text-white">{filteredItems.length}</strong> pozycji
                  </div>
                </div>

                {/* TABELA SPRZĘTU */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                          <th className="py-3.5 px-4">Sprzęt i uwagi</th>
                          <th className="py-3.5 px-3">Kategoria</th>
                          <th className="py-3.5 px-3 text-right">Kupno</th>
                          <th className="py-3.5 px-3 text-right">Naprawa</th>
                          <th className="py-3.5 px-3 text-right">Sprzedaż</th>
                          <th className="py-3.5 px-3 text-right">Zysk</th>
                          <th className="py-3.5 px-4 text-right">Akcje</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/80 text-sm">
                        {filteredItems.map((it) => {
                          const isSold = it.sellPrice > 0;
                          const profit = it.sellPrice - it.buyPrice - it.repairCost;
                          return (
                            <tr key={it.id} className="hover:bg-slate-800/40 transition">
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-white">{it.name}</div>
                                {it.note && <div className="text-xs text-slate-400 mt-0.5">{it.note}</div>}
                                <div className="text-[11px] text-slate-500 mt-0.5">
                                  Zakup: {it.date}
                                  {isSold && it.sellDate ? ` • Sprzedaż: ${it.sellDate}` : ''}
                                </div>
                              </td>
                              <td className="py-3.5 px-3">
                                <span
                                  className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${
                                    it.category === 'Kolumny'
                                      ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                      : it.category === 'Wzmacniacze'
                                      ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                      : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                  }`}
                                >
                                  {it.category}
                                </span>
                              </td>
                              <td className="py-3.5 px-3 text-right text-slate-300 whitespace-nowrap">
                                {it.buyPrice.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="py-3.5 px-3 text-right text-slate-300 whitespace-nowrap">
                                {it.repairCost.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="py-3.5 px-3 text-right whitespace-nowrap">
                                {sellingItemId === it.id ? (
                                  <div className="flex items-center justify-end gap-1">
                                    <input
                                      type="number"
                                      placeholder="Cena zł"
                                      value={quickSellPrice}
                                      onChange={(e) => setQuickSellPrice(e.target.value)}
                                      className="w-24 bg-slate-950 border border-amber-500 rounded-lg px-2 py-1 text-xs text-white"
                                    />
                                    <button
                                      onClick={() => handleConfirmQuickSell(it.id)}
                                      className="px-2 py-1 bg-emerald-500 text-slate-950 rounded-lg text-xs font-bold"
                                    >
                                      OK
                                    </button>
                                  </div>
                                ) : isSold ? (
                                  <span className="font-medium text-white">
                                    {it.sellPrice.toLocaleString('pl-PL')} zł
                                  </span>
                                ) : (
                                  <button
                                    onClick={() => {
                                      setSellingItemId(it.id);
                                      setQuickSellPrice('');
                                    }}
                                    className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 text-xs font-medium"
                                  >
                                    Na stanie • Sprzedaj
                                  </button>
                                )}
                              </td>
                              <td className="py-3.5 px-3 text-right font-bold whitespace-nowrap">
                                {isSold ? (
                                  <span className={profit >= 0 ? 'text-emerald-400' : 'text-rose-400'}>
                                    {profit >= 0 ? '+' : ''}
                                    {profit.toLocaleString('pl-PL')} zł
                                  </span>
                                ) : (
                                  <span className="text-slate-500 font-normal">—</span>
                                )}
                              </td>
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {confirmDeleteId === it.id ? (
                                  <div className="inline-flex items-center gap-1">
                                    <button
                                      onClick={() => {
                                        setItems(items.filter((x) => x.id !== it.id));
                                        setConfirmDeleteId(null);
                                        showToast('Usunięto pozycję.');
                                      }}
                                      className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs font-semibold"
                                    >
                                      Usuń
                                    </button>
                                    <button
                                      onClick={() => setConfirmDeleteId(null)}
                                      className="px-2 py-1 rounded-lg bg-slate-700 text-slate-200 text-xs"
                                    >
                                      Anuluj
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => setConfirmDeleteId(it.id)}
                                    title="Usuń pozycję"
                                    className="p-2 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition"
                                  >
                                    <Icon name="trash" className="w-4 h-4" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* ====================================================================
            ZAKŁADKA 2: MAPA NIEMIEC I HOLANDII + POŁĄCZENIE Z MAPAMI GOOGLE
           ==================================================================== */}
        {activeTab === 'map' && (
          <div className="space-y-5">
            {/* PASEK GÓRNY MAPY Z PRZEŁĄCZNIKIEM WIDOKU I TRASĄ GOOGLE MAPS */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Icon name="map" className="w-5 h-5 text-amber-400" />
                  Mapa Niemiec i Holandii + Mapy Google
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kliknij na mapę lub wyszukaj miasto w DE/NL, aby oznaczyć odbiór towaru i otworzyć punkt w aplikacji Mapy Google.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="inline-flex rounded-xl bg-slate-950 p-1 border border-slate-800">
                  <button
                    onClick={() => setMapViewMode('interactive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      mapViewMode === 'interactive'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Mapa DE / NL (Kliknij punkt)
                  </button>
                  <button
                    onClick={() => setMapViewMode('google')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      mapViewMode === 'google'
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-300 hover:text-white'
                    }`}
                  >
                    Podgląd Map Google
                  </button>
                </div>

                {getMultiStopRouteUrl() && (
                  <a
                    href={getMultiStopRouteUrl()}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
                  >
                    <Icon name="route" className="w-4 h-4" />
                    Trasa wszystkich odbiorów w Google Maps
                  </a>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* LEWA KOLUMNA: INTERAKTYWNA MAPA DE/NL LUB PODGLĄD GOOGLE MAPS */}
              <div className="lg:col-span-7 space-y-3">
                {mapViewMode === 'interactive' ? (
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3">
                    {/* Szybkie skróty miast w DE i NL */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2.5 mb-2 border-b border-slate-800">
                      <span className="text-[11px] text-slate-400 shrink-0 mr-1">Szybki wybór:</span>
                      {[
                        DE_NL_CITIES[0], // Amsterdam
                        DE_NL_CITIES[1], // Rotterdam
                        DE_NL_CITIES[3], // Eindhoven
                        DE_NL_CITIES[4], // Venlo
                        DE_NL_CITIES[10], // Dortmund
                        DE_NL_CITIES[12], // Kolonia
                        DE_NL_CITIES[15], // Hamburg
                        DE_NL_CITIES[18], // Berlin
                        DE_NL_CITIES[21], // Monachium
                      ].map((city) => (
                        <button
                          key={city.name}
                          type="button"
                          onClick={() => handleSelectPresetCity(city)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 whitespace-nowrap transition"
                        >
                          {city.name}
                        </button>
                      ))}
                    </div>

                    {/* OBSZAR KLIKALNEJ MAPY NIEMIEC I HOLANDII */}
                    <div
                      onClick={handleMapClick}
                      className="relative w-full aspect-[4/3] sm:aspect-[16/11] bg-[#0b1726] rounded-xl overflow-hidden border border-slate-700 cursor-crosshair select-none"
                    >
                      {/* Siatka i kontury geograficzne Holandii oraz Niemiec */}
                      <svg
                        viewBox="0 0 100 100"
                        preserveAspectRatio="none"
                        className="absolute inset-0 w-full h-full pointer-events-none"
                      >
                        <defs>
                          <pattern id="grid" width="10" height="10" patternUnits="userSpaceOnUse">
                            <path
                              d="M 10 0 L 0 0 0 10"
                              fill="none"
                              stroke="rgba(148, 163, 184, 0.08)"
                              strokeWidth="0.3"
                            />
                          </pattern>
                        </defs>
                        <rect width="100" height="100" fill="url(#grid)" />

                        {/* Morze Północne i Bałtyk */}
                        <text x="8" y="16" fill="rgba(56, 189, 248, 0.25)" fontSize="3.2" fontWeight="bold">
                          MORZE PÓŁNOCNE
                        </text>
                        <text x="64" y="11" fill="rgba(56, 189, 248, 0.25)" fontSize="3.2" fontWeight="bold">
                          BAŁTYK
                        </text>

                        {/* Kontur Holandii (NL) */}
                        <polygon
                          points="4,46 12,33 24,22 33,23 33,38 28,46 25,54 14,53 5,50"
                          fill="rgba(245, 158, 11, 0.14)"
                          stroke="rgba(251, 191, 36, 0.55)"
                          strokeWidth="0.6"
                        />
                        <text x="15" y="40" fill="rgba(251, 191, 36, 0.45)" fontSize="4.5" fontWeight="bold">
                          NL
                        </text>

                        {/* Kontur Niemiec (DE) */}
                        <polygon
                          points="33,23 48,14 58,15 76,17 88,22 96,42 94,54 78,60 85,78 78,94 56,96 36,93 26,84 25,54 28,46 33,38"
                          fill="rgba(56, 189, 248, 0.12)"
                          stroke="rgba(56, 189, 248, 0.5)"
                          strokeWidth="0.6"
                        />
                        <text x="56" y="54" fill="rgba(125, 211, 252, 0.35)" fontSize="6" fontWeight="bold">
                          NIEMCY (DE)
                        </text>

                        {/* Główne korytarze autostrad (A2 / A3 / A1 / A7) */}
                        <path
                          d="M 14 35 L 36 45 L 54 42 L 84 33"
                          fill="none"
                          stroke="rgba(248, 250, 252, 0.16)"
                          strokeWidth="0.5"
                          strokeDasharray="1.5,1"
                        />
                        <path
                          d="M 35 46 L 45 64 L 68 88"
                          fill="none"
                          stroke="rgba(248, 250, 252, 0.16)"
                          strokeWidth="0.5"
                          strokeDasharray="1.5,1"
                        />
                        <path
                          d="M 56 19 L 54 45 L 51 89"
                          fill="none"
                          stroke="rgba(248, 250, 252, 0.16)"
                          strokeWidth="0.5"
                          strokeDasharray="1.5,1"
                        />
                      </svg>

                      {/* Kropki miast orientacyjnych */}
                      {DE_NL_CITIES.filter((_, idx) => idx % 2 === 0).map((city) => {
                        const pos = latLngToPercent(city.lat, city.lng);
                        return (
                          <div
                            key={city.name}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none flex flex-col items-center"
                          >
                            <div className="w-1.5 h-1.5 rounded-full bg-slate-400/60" />
                            <span className="text-[9px] sm:text-[10px] text-slate-400/80 whitespace-nowrap mt-0.5">
                              {city.name.split(' ')[0]}
                            </span>
                          </div>
                        );
                      })}

                      {/* Podgląd aktualnie wybranego nowego punktu przed zapisaniem */}
                      {(() => {
                        const previewPos = latLngToPercent(newPin.lat, newPin.lng);
                        return (
                          <div
                            style={{ left: `${previewPos.x}%`, top: `${previewPos.y}%` }}
                            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-10"
                          >
                            <div className="w-6 h-6 rounded-full border-2 border-dashed border-white animate-spin" />
                          </div>
                        );
                      })()}

                      {/* ZAPISANE PUNKTY ODBIORÓW I KIEROWCÓW */}
                      {pins.map((pin) => {
                        const pos = latLngToPercent(pin.lat, pin.lng);
                        const isSelected = selectedPin?.id === pin.id;
                        const isDriver = pin.type === 'driver';
                        return (
                          <button
                            key={pin.id}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedPinId(pin.id);
                            }}
                            style={{ left: `${pos.x}%`, top: `${pos.y}%` }}
                            className={`absolute -translate-x-1/2 -translate-y-full z-20 group transition-transform ${
                              isSelected ? 'scale-125 z-30' : 'hover:scale-110'
                            }`}
                          >
                            <div
                              className={`px-2 py-1 rounded-xl shadow-lg border text-[10px] font-bold flex items-center gap-1 whitespace-nowrap ${
                                isDriver
                                  ? 'bg-sky-500 text-slate-950 border-white'
                                  : pin.done
                                  ? 'bg-slate-700 text-slate-300 border-slate-500'
                                  : 'bg-amber-500 text-slate-950 border-white'
                              }`}
                            >
                              <Icon name={isDriver ? 'truck' : 'pin'} className="w-3.5 h-3.5" />
                              <span className="max-w-[110px] truncate">{pin.title}</span>
                            </div>
                            <div
                              className={`w-2.5 h-2.5 rotate-45 mx-auto -mt-1.5 ${
                                isDriver
                                  ? 'bg-sky-500'
                                  : pin.done
                                  ? 'bg-slate-700'
                                  : 'bg-amber-500'
                              }`}
                            />
                          </button>
                        );
                      })}
                    </div>

                    {/* LEGENDA POD MAPĄ */}
                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 text-xs text-slate-400">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                          Towar do odbioru
                        </span>
                        <span className="flex items-center gap-1.5">
                          <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                          Kierowca w trasie
                        </span>
                      </div>
                      <span>Kliknij dowolne miejsce na mapie, aby ustawić pinezkę</span>
                    </div>
                  </div>
                ) : (
                  /* EMBEDDED GOOGLE MAPS (DZIAŁA BEZ KLUCZA API) */
                  <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3 space-y-2.5">
                    <div className="flex items-center justify-between text-xs text-slate-300">
                      <span>
                        Wybrany punkt na Mapach Google:{' '}
                        <strong className="text-amber-400">{selectedPin?.title || 'Niemcy / Holandia'}</strong>
                      </span>
                      {selectedPin && (
                        <a
                          href={getGoogleMapsUrl(selectedPin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:underline flex items-center gap-1 font-medium"
                        >
                          Otwórz w aplikacji Google Maps
                          <Icon name="external" className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="w-full aspect-[4/3] sm:aspect-[16/11] rounded-xl overflow-hidden border border-slate-700 bg-slate-950">
                      <iframe
                        title="Podgląd Map Google"
                        src={googleEmbedSrc}
                        className="w-full h-full border-0"
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* PRAWA KOLUMNA: DODAWANIE PUNKTU + LISTA ODBIORÓW Z LINKAMI GOOGLE MAPS */}
              <div className="lg:col-span-5 space-y-4">
                {/* WYSZUKIWARKA ADRESU / MIASTA W DE LUB NL */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <form onSubmit={handleSearchLocation} className="flex gap-2">
                    <div className="relative flex-1">
                      <input
                        type="text"
                        placeholder="Wpisz miasto lub kod DE/NL (np. Venlo, 44135 Dortmund)..."
                        value={citySearch}
                        onChange={(e) => setCitySearch(e.target.value)}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl pl-3 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingCity}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
                    >
                      <Icon name="search" className="w-4 h-4 text-amber-400" />
                      {isSearchingCity ? 'Szukam...' : 'Szukaj'}
                    </button>
                  </form>

                  {/* FORMULARZ NOWEGO PUNKTU NA MAPIE */}
                  <form onSubmit={handleAddPin} className="space-y-3 pt-2 border-t border-slate-800">
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setNewPin({ ...newPin, type: 'pickup' })}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                          newPin.type === 'pickup'
                            ? 'bg-amber-500 text-slate-950 border-amber-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        <Icon name="pin" className="w-4 h-4" />
                        Odbiór towaru
                      </button>

                      <button
                        type="button"
                        onClick={() => setNewPin({ ...newPin, type: 'driver' })}
                        className={`py-2 px-3 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 border transition ${
                          newPin.type === 'driver'
                            ? 'bg-sky-500 text-slate-950 border-sky-400'
                            : 'bg-slate-950 text-slate-300 border-slate-800'
                        }`}
                      >
                        <Icon name="truck" className="w-4 h-4" />
                        Kierowca
                      </button>
                    </div>

                    <input
                      type="text"
                      placeholder={
                        newPin.type === 'pickup'
                          ? 'Co do zabrania? (np. Kolumny Canton + wzmacniacz)'
                          : 'Kierowca / trasa (np. Kierowca Tomek - trasa A2)'
                      }
                      value={newPin.title}
                      onChange={(e) => setNewPin({ ...newPin, title: e.target.value })}
                      className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="text"
                        placeholder="Miasto / adres"
                        value={newPin.address}
                        onChange={(e) => setNewPin({ ...newPin, address: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                      <input
                        type="text"
                        placeholder="Uwagi (godzina, kwota EUR, tel.)"
                        value={newPin.note}
                        onChange={(e) => setNewPin({ ...newPin, note: e.target.value })}
                        className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                      />
                    </div>

                    <button
                      type="submit"
                      className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition"
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      Dodaj punkt i połącz z Mapami Google
                    </button>
                  </form>
                </div>

                {/* LISTA PUNKTÓW Z BEZPOŚREDNIMI PRZYCISKAMI DO MAP GOOGLE */}
                <div className="space-y-2.5 max-h-[430px] overflow-y-auto pr-1">
                  {pins.map((pin) => {
                    const isDriver = pin.type === 'driver';
                    const isSelected = selectedPin?.id === pin.id;
                    return (
                      <div
                        key={pin.id}
                        onClick={() => setSelectedPinId(pin.id)}
                        className={`p-3.5 rounded-2xl border transition cursor-pointer ${
                          isSelected
                            ? 'bg-slate-800/90 border-amber-500/70'
                            : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-start gap-2.5">
                            <div
                              className={`mt-0.5 p-2 rounded-xl shrink-0 ${
                                isDriver
                                  ? 'bg-sky-500/20 text-sky-400'
                                  : 'bg-amber-500/20 text-amber-400'
                              }`}
                            >
                              <Icon name={isDriver ? 'truck' : 'pin'} className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`font-semibold text-sm ${
                                    pin.done ? 'line-through text-slate-500' : 'text-white'
                                  }`}
                                >
                                  {pin.title}
                                </span>
                              </div>
                              <div className="text-xs text-slate-400 mt-0.5">{pin.address}</div>
                              {pin.note && (
                                <div className="text-xs text-slate-300 mt-1 bg-slate-950/70 px-2.5 py-1 rounded-lg border border-slate-800">
                                  {pin.note}
                                </div>
                              )}
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setPins(pins.filter((x) => x.id !== pin.id));
                              showToast('Usunięto punkt z mapy.');
                            }}
                            className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                            title="Usuń punkt"
                          >
                            <Icon name="trash" className="w-4 h-4" />
                          </button>
                        </div>

                        {/* PRZYCISKI INTEGRACJI Z GOOGLE MAPS DLA KAŻDEGO PUNKTU */}
                        <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-slate-800/80">
                          <a
                            href={getGoogleMapsUrl(pin)}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-3 py-1.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition"
                          >
                            <Icon name="external" className="w-3.5 h-3.5" />
                            Otwórz w Mapach Google
                          </a>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyTextToClipboard(
                                `${pin.title} (${pin.address}): ${getGoogleMapsUrl(pin)}`,
                                'Skopiowano punkt + link Google Maps dla kierowcy!'
                              );
                            }}
                            className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
                          >
                            <Icon name="copy" className="w-3.5 h-3.5 text-amber-400" />
                            Wyślij kierowcy
                          </button>

                          {!isDriver && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPins(
                                  pins.map((p) => (p.id === pin.id ? { ...p, done: !p.done } : p))
                                );
                              }}
                              className={`ml-auto px-2.5 py-1.5 rounded-xl text-xs font-medium border transition ${
                                pin.done
                                  ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-950 border-slate-700 text-slate-400 hover:text-white'
                              }`}
                            >
                              {pin.done ? '✓ Odebrane' : 'Oznacz odebrane'}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            ZAKŁADKA 3: PRZYCHODY INNE (FACEBOOK, OLX, TRANSPORT ITD.)
           ==================================================================== */}
        {activeTab === 'otherIncome' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Przychody inne razem</div>
                <div className="text-2xl font-bold text-white mt-1">
                  {otherIncomeStats.revenue.toLocaleString('pl-PL')} zł
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs text-slate-400">Koszty dodatkowe</div>
                <div className="text-2xl font-bold text-amber-400 mt-1">
                  {otherIncomeStats.costs.toLocaleString('pl-PL')} zł
                </div>
              </div>
              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-4">
                <div className="text-xs text-emerald-400 font-medium">Zysk netto (inne źródła)</div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">
                  +{otherIncomeStats.net.toLocaleString('pl-PL')} zł
                </div>
              </div>
            </div>

            <form
              onSubmit={handleAddOtherIncome}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <h2 className="text-base font-semibold text-white">
                Dodaj przychód z innego źródła (np. Facebook, OLX, transport)
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Za co / opis *</label>
                  <input
                    type="text"
                    placeholder="np. Sprzedaż kabli i akcesoriów na grupie FB"
                    value={newOther.title}
                    onChange={(e) => setNewOther({ ...newOther, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Źródło</label>
                  <select
                    value={newOther.source}
                    onChange={(e) => setNewOther({ ...newOther, source: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="Facebook Marketplace">Facebook Marketplace</option>
                    <option value="OLX">OLX</option>
                    <option value="Allegro">Allegro</option>
                    <option value="Transport / Przywóz">Transport / Przywóz</option>
                    <option value="Inne">Inne</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Przychód (zł) *</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newOther.amount}
                    onChange={(e) => setNewOther({ ...newOther, amount: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Koszt własny (zł)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newOther.cost}
                    onChange={(e) => setNewOther({ ...newOther, cost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 transition"
              >
                <Icon name="plus" className="w-4 h-4" />
                Dodaj przychód
              </button>
            </form>

            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/60 text-xs uppercase text-slate-400">
                      <th className="py-3.5 px-4">Opis</th>
                      <th className="py-3.5 px-3">Źródło</th>
                      <th className="py-3.5 px-3 text-right">Przychód</th>
                      <th className="py-3.5 px-3 text-right">Koszt</th>
                      <th className="py-3.5 px-3 text-right">Zysk netto</th>
                      <th className="py-3.5 px-4 text-right">Usuń</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80 text-sm">
                    {otherIncomes.map((item) => {
                      const net = item.amount - item.cost;
                      return (
                        <tr key={item.id} className="hover:bg-slate-800/40">
                          <td className="py-3.5 px-4">
                            <div className="font-semibold text-white">{item.title}</div>
                            <div className="text-xs text-slate-500">{item.date}</div>
                          </td>
                          <td className="py-3.5 px-3">
                            <span className="px-2.5 py-1 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-medium">
                              {item.source}
                            </span>
                          </td>
                          <td className="py-3.5 px-3 text-right text-white font-medium">
                            {item.amount.toLocaleString('pl-PL')} zł
                          </td>
                          <td className="py-3.5 px-3 text-right text-slate-400">
                            {item.cost.toLocaleString('pl-PL')} zł
                          </td>
                          <td className="py-3.5 px-3 text-right font-bold text-emerald-400">
                            +{net.toLocaleString('pl-PL')} zł
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            <button
                              onClick={() => {
                                setOtherIncomes(otherIncomes.filter((x) => x.id !== item.id));
                                showToast('Usunięto wpis.');
                              }}
                              className="p-2 text-slate-400 hover:text-rose-400 rounded-lg"
                            >
                              <Icon name="trash" className="w-4 h-4" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ====================================================================
            ZAKŁADKA 4: SKUTECZNOŚĆ REKLAM (PORTALE I LICZBA ODEZWANYCH OSÓB)
           ==================================================================== */}
        {activeTab === 'ads' && (
          <div className="space-y-6">
            {/* LIDERZY SKUTECZNOŚCI */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-gradient-to-br from-amber-500/20 to-slate-900 border border-amber-500/40 rounded-2xl p-4">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase text-amber-400">
                  <Icon name="trophy" className="w-4 h-4" />
                  Najlepsza reklama (najwięcej osób)
                </div>
                <div className="text-base font-bold text-white mt-1.5 line-clamp-1">
                  {adAnalytics.bestAd ? adAnalytics.bestAd.title : 'Brak danych'}
                </div>
                <div className="text-xs text-slate-300 mt-1">
                  {adAnalytics.bestAd
                    ? `${adAnalytics.bestAd.portal} • ${adAnalytics.bestAd.leads} odezwanych osób`
                    : 'Dodaj pierwszą reklamę poniżej'}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs uppercase font-semibold text-sky-400">
                  Najskuteczniejszy portal
                </div>
                <div className="text-xl font-bold text-white mt-1.5">
                  {adAnalytics.bestPortal ? adAnalytics.bestPortal.portal : '—'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {adAnalytics.bestPortal
                    ? `Łącznie ${adAnalytics.bestPortal.count} zapytań od klientów`
                    : 'Brak zapytań'}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
                <div className="text-xs uppercase font-semibold text-emerald-400">
                  Wszystkie odezwane osoby
                </div>
                <div className="text-2xl font-bold text-white mt-1.5">{adAnalytics.totalLeads}</div>
                <div className="text-xs text-slate-400 mt-1">
                  Klikaj „+1 osoba” przy każdej nowej wiadomości
                </div>
              </div>
            </div>

            {/* FORMULARZ DODANIA REKLAMY / OGŁOSZENIA */}
            <form
              onSubmit={handleAddAd}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4"
            >
              <h2 className="text-base font-semibold text-white">
                Dodaj reklamę lub ogłoszenie do śledzenia
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs text-slate-400 mb-1">Nazwa reklamy / ogłoszenia *</label>
                  <input
                    type="text"
                    placeholder="np. Reklama FB: Zestawy kolumn z Niemiec"
                    value={newAd.title}
                    onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Portal</label>
                  <select
                    value={newAd.portal}
                    onChange={(e) => setNewAd({ ...newAd, portal: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  >
                    <option value="Facebook">Facebook</option>
                    <option value="Grupy Facebook">Grupy Facebook</option>
                    <option value="OLX">OLX</option>
                    <option value="Allegro">Allegro</option>
                    <option value="Instagram">Instagram</option>
                    <option value="Google">Google</option>
                    <option value="TikTok">TikTok</option>
                    <option value="Kleinanzeigen (DE)">Kleinanzeigen (DE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Ile osób się odezwało</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0"
                    value={newAd.leads}
                    onChange={(e) => setNewAd({ ...newAd, leads: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Koszt reklamy (zł)</label>
                  <input
                    type="number"
                    min="0"
                    placeholder="0 (darmowe)"
                    value={newAd.adCost}
                    onChange={(e) => setNewAd({ ...newAd, adCost: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold px-5 py-2.5 rounded-xl text-sm inline-flex items-center gap-2 transition"
              >
                <Icon name="plus" className="w-4 h-4" />
                Dodaj reklamę
              </button>
            </form>

            {/* RANKING REKLAM Z SZYBKIM PRZYCISKIEM +1 OSOBA */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[...ads]
                .sort((a, b) => b.leads - a.leads)
                .map((ad, index) => {
                  const cpl = ad.leads > 0 && ad.adCost > 0 ? (ad.adCost / ad.leads).toFixed(2) : null;
                  return (
                    <div
                      key={ad.id}
                      className={`p-4 rounded-2xl border bg-slate-900 flex flex-col justify-between gap-3 ${
                        index === 0 ? 'border-amber-500/60' : 'border-slate-800'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            {index === 0 && (
                              <span className="px-2 py-0.5 rounded-md bg-amber-500 text-slate-950 text-[11px] font-bold">
                                #1 LIDER
                              </span>
                            )}
                            <span className="px-2.5 py-0.5 rounded-md bg-slate-800 text-sky-300 text-xs font-medium">
                              {ad.portal}
                            </span>
                            <span className="text-xs text-slate-500">{ad.date}</span>
                          </div>
                          <h3 className="font-semibold text-white text-sm sm:text-base mt-1.5">
                            {ad.title}
                          </h3>
                        </div>

                        <button
                          onClick={() => {
                            setAds(ads.filter((x) => x.id !== ad.id));
                            showToast('Usunięto reklamę.');
                          }}
                          className="p-1.5 text-slate-500 hover:text-rose-400 rounded-lg"
                        >
                          <Icon name="trash" className="w-4 h-4" />
                        </button>
                      </div>

                      <div className="flex items-center justify-between pt-3 border-t border-slate-800">
                        <div>
                          <div className="text-xs text-slate-400">Odezwało się osób:</div>
                          <div className="text-xl font-bold text-emerald-400">
                            {ad.leads} <span className="text-xs font-normal text-slate-400">os.</span>
                          </div>
                          <div className="text-[11px] text-slate-500">
                            Koszt: {ad.adCost} zł {cpl ? `(${cpl} zł / osoba)` : '(bezpłatne)'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => updateAdLeads(ad.id, -1)}
                            className="w-10 h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-base"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => updateAdLeads(ad.id, 1)}
                            className="px-4 h-10 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm"
                          >
                            +1 osoba
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}
      </main>

      {/* MODAL KOPII ZAPASOWEJ (PRZENOSZENIE MIĘDZY KOMPUTEREM A TELEFONEM) */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white">
                Kopia zapasowa i przenoszenie na telefon
              </h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                Zamknij ✕
              </button>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Skopiuj poniższy kod zapisu (np. na Google Keep / WhatsApp), aby wczytać wszystkie swoje kolumny, punkty na mapie i statystyki reklam na telefonie lub innym komputerze.
            </p>

            <div className="space-y-2">
              <button
                onClick={() =>
                  copyTextToClipboard(
                    getFullBackupJson(),
                    'Skopiowano pełną kopię danych Audio Klasyki!'
                  )
                }
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm"
              >
                1. Skopiuj wszystkie aktualne dane do schowka
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <label className="block text-xs text-slate-400">
                2. Wklej skopiowane dane tutaj, aby je wczytać:
              </label>
              <textarea
                rows={4}
                placeholder='Wklej tutaj kod kopii zapasowej {"items": ...}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleImportBackup}
                className="w-full py-2.5 rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs sm:text-sm"
              >
                Wczytaj dane z wklejonego tekstu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}