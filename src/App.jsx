import React, { useState, useMemo, useEffect } from 'react';

// ============================================================================
// PROSTY ZAPIS LOKALNY + PRZENOSZENIE DANYCH NA TELEFON JEDNYM LINKIEM
// Zero dodatkowych kont, zero tokenów, zero kart kredytowych.
// ============================================================================
const STORAGE_KEY = 'audio_klasyki_workspace_v3';

function encodeDataToUrl(dataObj) {
  try {
    const json = JSON.stringify(dataObj);
    const bytes = new TextEncoder().encode(json);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary)
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '');
  } catch {
    return '';
  }
}

function decodeDataFromUrl(encoded) {
  try {
    let b64 = encoded.replace(/-/g, '+').replace(/_/g, '/');
    while (b64.length % 4) b64 += '=';
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const json = new TextDecoder().decode(bytes);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

const MONTH_NAMES_PL = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

// Granice geograficzne dla interaktywnej mapy Niemiec i Holandii
const MAP_BOUNDS = {
  minLng: 3.1,
  maxLng: 15.3,
  minLat: 47.1,
  maxLat: 55.2,
  width: 800,
  height: 620,
};

function geoToSvg(lat, lng) {
  const x =
    ((lng - MAP_BOUNDS.minLng) / (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng)) *
    MAP_BOUNDS.width;
  const y =
    ((MAP_BOUNDS.maxLat - lat) / (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat)) *
    MAP_BOUNDS.height;
  return {
    x: Math.max(20, Math.min(MAP_BOUNDS.width - 20, x)),
    y: Math.max(20, Math.min(MAP_BOUNDS.height - 20, y)),
  };
}

function svgToGeo(x, y) {
  const lng =
    MAP_BOUNDS.minLng +
    (x / MAP_BOUNDS.width) * (MAP_BOUNDS.maxLng - MAP_BOUNDS.minLng);
  const lat =
    MAP_BOUNDS.maxLat -
    (y / MAP_BOUNDS.height) * (MAP_BOUNDS.maxLat - MAP_BOUNDS.minLat);
  return {
    lat: Number(lat.toFixed(4)),
    lng: Number(lng.toFixed(4)),
  };
}

// Główne miasta DE i NL do szybkiego wyboru na mapie
const DE_NL_CITIES = [
  { name: 'Amsterdam (NL)', country: 'NL', lat: 52.3676, lng: 4.9041 },
  { name: 'Rotterdam (NL)', country: 'NL', lat: 51.9244, lng: 4.4777 },
  { name: 'Utrecht (NL)', country: 'NL', lat: 52.0907, lng: 5.1214 },
  { name: 'Eindhoven (NL)', country: 'NL', lat: 51.4416, lng: 5.4697 },
  { name: 'Venlo (NL)', country: 'NL', lat: 51.3704, lng: 6.1724 },
  { name: 'Groningen (NL)', country: 'NL', lat: 53.2194, lng: 6.5665 },
  { name: 'Dortmund / NRW (DE)', country: 'DE', lat: 51.5136, lng: 7.4653 },
  { name: 'Kolonia / Köln (DE)', country: 'DE', lat: 50.9375, lng: 6.9603 },
  { name: 'Düsseldorf (DE)', country: 'DE', lat: 51.2277, lng: 6.7735 },
  { name: 'Hamburg (DE)', country: 'DE', lat: 53.5511, lng: 9.9937 },
  { name: 'Brema (DE)', country: 'DE', lat: 53.0793, lng: 8.8017 },
  { name: 'Hanower (DE)', country: 'DE', lat: 52.3759, lng: 9.732 },
  { name: 'Berlin (DE)', country: 'DE', lat: 52.52, lng: 13.405 },
  { name: 'Frankfurt nad Menem (DE)', country: 'DE', lat: 50.1109, lng: 8.6821 },
  { name: 'Stuttgart (DE)', country: 'DE', lat: 48.7758, lng: 9.1829 },
  { name: 'Monachium (DE)', country: 'DE', lat: 48.1351, lng: 11.582 },
];

// Wbudowane ikony SVG (zero zewnętrznych bibliotek)
function Icon({ name, className = 'w-4 h-4' }) {
  const icons = {
    speaker: (
      <>
        <rect x="4" y="2" width="16" height="20" rx="2" />
        <circle cx="12" cy="14" r="4" />
        <line x1="12" y1="6" x2="12.01" y2="6" />
      </>
    ),
    map: (
      <>
        <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21" />
        <line x1="9" y1="3" x2="9" y2="18" />
        <line x1="15" y1="6" x2="15" y2="21" />
      </>
    ),
    truck: (
      <>
        <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
        <path d="M15 18H9" />
        <path d="M19 18h2a1 1 0 0 0 1-1v-3.65a1 1 0 0 0-.22-.624l-3.48-4.35A1 1 0 0 0 17.52 8H14" />
        <circle cx="17" cy="18" r="2" />
        <circle cx="7" cy="18" r="2" />
      </>
    ),
    pin: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
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
        <path d="M3 6h18" />
        <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
        <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
      </>
    ),
    megaphone: (
      <>
        <path d="m3 11 18-5v12L3 14v-3z" />
        <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
      </>
    ),
    dollar: (
      <>
        <line x1="12" y1="2" x2="12" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </>
    ),
    trending: (
      <>
        <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
        <polyline points="16 7 22 7 22 13" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="8" />
        <line x1="21" y1="21" x2="16.65" y2="16.65" />
      </>
    ),
    download: (
      <>
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </>
    ),
    copy: (
      <>
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </>
    ),
    route: (
      <>
        <circle cx="6" cy="19" r="3" />
        <path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15" />
        <circle cx="18" cy="5" r="3" />
      </>
    ),
    cloud: (
      <>
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z" />
      </>
    ),
    user: (
      <>
        <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    check: (
      <>
        <polyline points="20 6 9 17 4 12" />
      </>
    ),
    external: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
    edit: (
      <>
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </>
    ),
  };

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {icons[name] || null}
    </svg>
  );
}

// Przykładowe dane startowe (widoczne przy pierwszym uruchomieniu)
const DEFAULT_ITEMS = [
  {
    id: 'item-1',
    name: 'Technics SB-7000 (Para)',
    category: 'Kolumny',
    date: '2026-10-12',
    buyPrice: 1800,
    repairCost: 350,
    sellPrice: 3400,
    notes: 'Regeneracja zawieszeń, kupione w Dortmundzie',
  },
  {
    id: 'item-2',
    name: 'Pioneer SX-950',
    category: 'Wzmacniacze',
    date: '2026-10-25',
    buyPrice: 2200,
    repairCost: 400,
    sellPrice: 3950,
    notes: 'Przegląd końcówki mocy + czyszczenie potencjometrów',
  },
  {
    id: 'item-3',
    name: 'JBL L100 Century',
    category: 'Kolumny',
    date: '2026-11-04',
    buyPrice: 2900,
    repairCost: 250,
    sellPrice: null,
    notes: 'W trakcie renowacji obudowy fornir orzech',
  },
  {
    id: 'item-4',
    name: 'Marantz 2270',
    category: 'Wzmacniacze',
    date: '2026-11-09',
    buyPrice: 2400,
    repairCost: 150,
    sellPrice: 3700,
    notes: 'Odbiór Eindhoven, wymienione podświetlenie LED',
  },
];

const DEFAULT_PINS = [
  {
    id: 'pin-1',
    type: 'pickup',
    city: 'Eindhoven (NL)',
    description: '2x Kolumny Canton GLE 100 + wzmacniacz Sony TA-F70',
    lat: 51.4416,
    lng: 5.4697,
    done: false,
    createdAt: '2026-11-11',
  },
  {
    id: 'pin-2',
    type: 'pickup',
    city: 'Dortmund (DE)',
    description: 'Zestaw Vintage Philips + gramofon Dual 701 (opłacone)',
    lat: 51.5136,
    lng: 7.4653,
    done: false,
    createdAt: '2026-11-12',
  },
  {
    id: 'pin-3',
    type: 'driver',
    city: 'Venlo (NL)',
    description: 'Kierowca Marek – trasa powrotna A40 / A2',
    lat: 51.3704,
    lng: 6.1724,
    done: false,
    createdAt: '2026-11-12',
  },
];

const DEFAULT_OTHER_INCOMES = [
  {
    id: 'inc-1',
    title: 'Sprzedaż maskownic i kabli DIN (Facebook Marketplace)',
    source: 'Facebook Marketplace',
    date: '2026-10-18',
    amount: 480,
    cost: 50,
  },
  {
    id: 'inc-2',
    title: 'Przegląd i czyszczenie wzmacniacza dla klienta z grupy FB',
    source: 'Grupy Facebook',
    date: '2026-11-06',
    amount: 350,
    cost: 40,
  },
];

const DEFAULT_ADS = [
  {
    id: 'ad-1',
    title: 'Ogłoszenie: Kolumny Vintage z Niemiec i Holandii',
    portal: 'Facebook Marketplace',
    leads: 34,
    salesCount: 6,
    budget: 0,
    notes: 'Najwięcej pytań wieczorami po 19:00',
  },
  {
    id: 'ad-2',
    title: 'Post w grupie: Audio Vintage Polska',
    portal: 'Grupy Facebook',
    leads: 21,
    salesCount: 4,
    budget: 0,
    notes: 'Bardzo konkretni klienci',
  },
  {
    id: 'ad-3',
    title: 'Wyróżnione ogłoszenie wzmacniacze',
    portal: 'OLX',
    leads: 14,
    salesCount: 2,
    budget: 65,
    notes: 'Dobra widoczność w weekendy',
  },
];

function loadSavedData() {
  try {
    // 1. Sprawdź, czy otwarto link przesłany z komputera/telefonu (#data=...)
    if (typeof window !== 'undefined' && window.location.hash.includes('data=')) {
      const hashPart = window.location.hash.split('data=')[1]?.split('&')[0];
      if (hashPart) {
        const decoded = decodeDataFromUrl(hashPart);
        if (decoded && typeof decoded === 'object') {
          const cleanData = {
            items: Array.isArray(decoded.items) ? decoded.items : DEFAULT_ITEMS,
            pins: Array.isArray(decoded.pins) ? decoded.pins : DEFAULT_PINS,
            otherIncomes: Array.isArray(decoded.otherIncomes)
              ? decoded.otherIncomes
              : DEFAULT_OTHER_INCOMES,
            ads: Array.isArray(decoded.ads) ? decoded.ads : DEFAULT_ADS,
          };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(cleanData));
          window.history.replaceState({}, '', window.location.pathname);
          return { ...cleanData, fromLink: true };
        }
      }
    }

    // 2. Wczytaj zapis z pamięci urządzenia
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        items: Array.isArray(parsed.items) ? parsed.items : DEFAULT_ITEMS,
        pins: Array.isArray(parsed.pins) ? parsed.pins : DEFAULT_PINS,
        otherIncomes: Array.isArray(parsed.otherIncomes)
          ? parsed.otherIncomes
          : DEFAULT_OTHER_INCOMES,
        ads: Array.isArray(parsed.ads) ? parsed.ads : DEFAULT_ADS,
        fromLink: false,
      };
    }
  } catch {
    // Ignoruj błąd odczytu localStorage
  }
  return {
    items: DEFAULT_ITEMS,
    pins: DEFAULT_PINS,
    otherIncomes: DEFAULT_OTHER_INCOMES,
    ads: DEFAULT_ADS,
    fromLink: false,
  };
}

export default function App() {
  // Automatyczne ładowanie Tailwind CSS, jeśli nie ma go w index.html
  useEffect(() => {
    if (
      typeof document !== 'undefined' &&
      !document.getElementById('tailwind-cdn-script') &&
      !window.tailwind
    ) {
      const script = document.createElement('script');
      script.id = 'tailwind-cdn-script';
      script.src = 'https://cdn.tailwindcss.com';
      document.head.appendChild(script);
    }
  }, []);

  const savedData = useMemo(() => loadSavedData(), []);

  // Główny stan aplikacji
  const [activeTab, setActiveTab] = useState('inventory'); // 'inventory' | 'map' | 'other' | 'ads'
  const [items, setItems] = useState(savedData.items);
  const [pins, setPins] = useState(savedData.pins);
  const [otherIncomes, setOtherIncomes] = useState(savedData.otherIncomes);
  const [ads, setAds] = useState(savedData.ads);

  // Powiadomienie w aplikacji (zamiast alert/confirm)
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => {
      setToast((prev) => (prev && prev.message === message ? null : prev));
    }, 3500);
  };

  useEffect(() => {
    if (savedData.fromLink) {
      showToast('Wczytano najnowsze dane z przesłanego linku!');
    }
  }, [savedData.fromLink]);

  // Filtry okresu (Rok i Miesiąc) oraz podwidok rozbicia
  const [selectedYear, setSelectedYear] = useState('ALL');
  const [selectedMonth, setSelectedMonth] = useState('ALL');
  const [inventorySubView, setInventorySubView] = useState('list'); // 'list' | 'breakdown'

  // Filtry tabeli sprzętu
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('Wszystkie');
  const [statusFilter, setStatusFilter] = useState('Wszystkie');

  // Edycja ceny sprzedaży/naprawy bezpośrednio na liście
  const [editingItemId, setEditingItemId] = useState(null);
  const [editSellValue, setEditSellValue] = useState('');
  const [editRepairValue, setEditRepairValue] = useState('');

  // Formularz nowego sprzętu
  const todayStr = new Date().toISOString().slice(0, 10);
  const [newItem, setNewItem] = useState({
    name: '',
    category: 'Kolumny',
    date: todayStr,
    buyPrice: '',
    repairCost: '',
    sellPrice: '',
    notes: '',
  });

  // Stan mapy DE / NL i Google Maps
  const [mapMode, setMapMode] = useState('vector'); // 'vector' | 'google'
  const [selectedPinId, setSelectedPinId] = useState(
    savedData.pins[0]?.id || null
  );
  const [newPin, setNewPin] = useState({
    type: 'pickup',
    city: 'Dortmund (DE)',
    description: '',
    lat: 51.5136,
    lng: 7.4653,
  });

  // Formularz innych przychodów
  const [newIncome, setNewIncome] = useState({
    title: '',
    source: 'Facebook Marketplace',
    date: todayStr,
    amount: '',
    cost: '',
  });

  // Formularz reklam
  const [newAd, setNewAd] = useState({
    title: '',
    portal: 'Facebook Marketplace',
    leads: '1',
    salesCount: '0',
    budget: '0',
    notes: '',
  });

  // Modal kopii zapasowej
  const [showBackupModal, setShowBackupModal] = useState(false);
  const [importText, setImportText] = useState('');

  // Generowanie linku zawierającego wszystkie aktualne dane (do wysłania na telefon)
  const getShareableDataLink = () => {
    if (typeof window === 'undefined') return '';
    const baseUrl = `${window.location.origin}${window.location.pathname}`;
    const encoded = encodeDataToUrl({ items, pins, otherIncomes, ads });
    return encoded ? `${baseUrl}#data=${encoded}` : baseUrl;
  };

  // Automatyczny zapis lokalny w przeglądarce
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

  // ==========================================================================
  // OBLICZENIA FINANSOWE (MIESIĄCE, LATA, PODSUMOWANIA)
  // ==========================================================================
  const availableYears = useMemo(() => {
    const yearsSet = new Set([new Date().getFullYear().toString()]);
    items.forEach((item) => {
      if (item.date && item.date.length >= 4) yearsSet.add(item.date.slice(0, 4));
    });
    otherIncomes.forEach((inc) => {
      if (inc.date && inc.date.length >= 4) yearsSet.add(inc.date.slice(0, 4));
    });
    return Array.from(yearsSet).sort((a, b) => b.localeCompare(a));
  }, [items, otherIncomes]);

  const matchesPeriod = (dateStr) => {
    if (!dateStr) return selectedYear === 'ALL' && selectedMonth === 'ALL';
    const y = dateStr.slice(0, 4);
    const m = dateStr.slice(5, 7);
    if (selectedYear !== 'ALL' && y !== selectedYear) return false;
    if (selectedMonth !== 'ALL' && m !== selectedMonth) return false;
    return true;
  };

  const periodItems = useMemo(
    () => items.filter((item) => matchesPeriod(item.date)),
    [items, selectedYear, selectedMonth]
  );

  const periodOtherIncomes = useMemo(
    () => otherIncomes.filter((inc) => matchesPeriod(inc.date)),
    [otherIncomes, selectedYear, selectedMonth]
  );

  const filteredItems = useMemo(() => {
    return periodItems.filter((item) => {
      const matchesSearch =
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.notes || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat =
        categoryFilter === 'Wszystkie' || item.category === categoryFilter;
      const isSold = item.sellPrice !== null && item.sellPrice !== '';
      const matchesStat =
        statusFilter === 'Wszystkie' ||
        (statusFilter === 'Sprzedane' && isSold) ||
        (statusFilter === 'Na stanie' && !isSold);
      return matchesSearch && matchesCat && matchesStat;
    });
  }, [periodItems, searchQuery, categoryFilter, statusFilter]);

  const periodStats = useMemo(() => {
    let totalBuy = 0;
    let totalRepair = 0;
    let totalSell = 0;
    let realizedProfit = 0;
    let stockValue = 0;
    let soldCount = 0;
    let stockCount = 0;

    periodItems.forEach((item) => {
      const buy = Number(item.buyPrice) || 0;
      const rep = Number(item.repairCost) || 0;
      totalBuy += buy;
      totalRepair += rep;

      if (item.sellPrice !== null && item.sellPrice !== '') {
        const sell = Number(item.sellPrice) || 0;
        totalSell += sell;
        realizedProfit += sell - buy - rep;
        soldCount += 1;
      } else {
        stockValue += buy + rep;
        stockCount += 1;
      }
    });

    const otherProfit = periodOtherIncomes.reduce(
      (sum, inc) => sum + ((Number(inc.amount) || 0) - (Number(inc.cost) || 0)),
      0
    );

    return {
      totalBuy,
      totalRepair,
      totalSell,
      realizedProfit,
      stockValue,
      soldCount,
      stockCount,
      otherProfit,
    };
  }, [periodItems, periodOtherIncomes]);

  // Łączny zysk netto ze wszystkich okresów (w nagłówku)
  const totalCombinedProfit = useMemo(() => {
    const equipProfit = items.reduce((sum, item) => {
      if (item.sellPrice === null || item.sellPrice === '') return sum;
      return (
        sum +
        ((Number(item.sellPrice) || 0) -
          (Number(item.buyPrice) || 0) -
          (Number(item.repairCost) || 0))
      );
    }, 0);
    const otherNet = otherIncomes.reduce(
      (sum, inc) => sum + ((Number(inc.amount) || 0) - (Number(inc.cost) || 0)),
      0
    );
    return equipProfit + otherNet;
  }, [items, otherIncomes]);

  // Rozbicie na Lata i Miesiące
  const { yearlyBreakdown, monthlyBreakdown } = useMemo(() => {
    const yearMap = new Map();
    const monthMap = new Map();

    const ensureYear = (y) => {
      if (!yearMap.has(y)) {
        yearMap.set(y, {
          year: y,
          buy: 0,
          repair: 0,
          sell: 0,
          equipProfit: 0,
          otherProfit: 0,
          boughtCount: 0,
          soldCount: 0,
        });
      }
      return yearMap.get(y);
    };

    const ensureMonth = (ym) => {
      if (!monthMap.has(ym)) {
        const [y, m] = ym.split('-');
        const monthIdx = Math.max(0, Math.min(11, parseInt(m, 10) - 1));
        monthMap.set(ym, {
          ym,
          year: y,
          month: m,
          label: `${MONTH_NAMES_PL[monthIdx]} ${y}`,
          buy: 0,
          repair: 0,
          sell: 0,
          equipProfit: 0,
          otherProfit: 0,
          boughtCount: 0,
          soldCount: 0,
        });
      }
      return monthMap.get(ym);
    };

    items.forEach((item) => {
      const d = item.date || todayStr;
      const y = d.slice(0, 4);
      const ym = d.slice(0, 7);
      const buy = Number(item.buyPrice) || 0;
      const rep = Number(item.repairCost) || 0;
      const isSold = item.sellPrice !== null && item.sellPrice !== '';
      const sell = isSold ? Number(item.sellPrice) || 0 : 0;
      const profit = isSold ? sell - buy - rep : 0;

      const yObj = ensureYear(y);
      yObj.buy += buy;
      yObj.repair += rep;
      yObj.sell += sell;
      yObj.equipProfit += profit;
      yObj.boughtCount += 1;
      if (isSold) yObj.soldCount += 1;

      const mObj = ensureMonth(ym);
      mObj.buy += buy;
      mObj.repair += rep;
      mObj.sell += sell;
      mObj.equipProfit += profit;
      mObj.boughtCount += 1;
      if (isSold) mObj.soldCount += 1;
    });

    otherIncomes.forEach((inc) => {
      const d = inc.date || todayStr;
      const y = d.slice(0, 4);
      const ym = d.slice(0, 7);
      const net = (Number(inc.amount) || 0) - (Number(inc.cost) || 0);

      ensureYear(y).otherProfit += net;
      ensureMonth(ym).otherProfit += net;
    });

    const yearly = Array.from(yearMap.values()).sort((a, b) =>
      b.year.localeCompare(a.year)
    );
    const monthly = Array.from(monthMap.values())
      .filter((m) => selectedYear === 'ALL' || m.year === selectedYear)
      .sort((a, b) => b.ym.localeCompare(a.ym));

    return { yearlyBreakdown: yearly, monthlyBreakdown: monthly };
  }, [items, otherIncomes, selectedYear, todayStr]);

  // ==========================================================================
  // AKCJE: SPRZĘT
  // ==========================================================================
  const handleAddItem = (e) => {
    e.preventDefault();
    if (!newItem.name.trim()) {
      showToast('Wpisz nazwę kolumn, wzmacniacza lub sprzętu.', 'error');
      return;
    }
    const created = {
      id: `item-${Date.now()}`,
      name: newItem.name.trim(),
      category: newItem.category,
      date: newItem.date || todayStr,
      buyPrice: Number(newItem.buyPrice) || 0,
      repairCost: Number(newItem.repairCost) || 0,
      sellPrice:
        newItem.sellPrice === '' ? null : Number(newItem.sellPrice) || 0,
      notes: newItem.notes.trim(),
    };
    setItems((prev) => [created, ...prev]);
    setNewItem({
      name: '',
      category: newItem.category,
      date: newItem.date || todayStr,
      buyPrice: '',
      repairCost: '',
      sellPrice: '',
      notes: '',
    });
    showToast(`Dodano "${created.name}" do ewidencji.`);
  };

  const handleDeleteItem = (id) => {
    setItems((prev) => prev.filter((it) => it.id !== id));
    showToast('Usunięto pozycję z magazynu.');
  };

  const startEditItem = (item) => {
    setEditingItemId(item.id);
    setEditSellValue(
      item.sellPrice !== null && item.sellPrice !== ''
        ? String(item.sellPrice)
        : ''
    );
    setEditRepairValue(String(item.repairCost || 0));
  };

  const saveEditItem = (id) => {
    setItems((prev) =>
      prev.map((it) => {
        if (it.id !== id) return it;
        return {
          ...it,
          repairCost: Number(editRepairValue) || 0,
          sellPrice:
            editSellValue.trim() === '' ? null : Number(editSellValue) || 0,
        };
      })
    );
    setEditingItemId(null);
    showToast('Zaktualizowano kwoty pozycji.');
  };

  // ==========================================================================
  // AKCJE: MAPA DE / NL I GOOGLE MAPS
  // ==========================================================================
  const handleVectorMapClick = (e) => {
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const scaleX = MAP_BOUNDS.width / rect.width;
    const scaleY = MAP_BOUNDS.height / rect.height;
    const clickX = (e.clientX - rect.left) * scaleX;
    const clickY = (e.clientY - rect.top) * scaleY;
    const coords = svgToGeo(clickX, clickY);

    // Znajdź najbliższe miasto orientacyjne
    let nearest = DE_NL_CITIES[0];
    let minDist = Infinity;
    DE_NL_CITIES.forEach((c) => {
      const d = Math.hypot(c.lat - coords.lat, c.lng - coords.lng);
      if (d < minDist) {
        minDist = d;
        nearest = c;
      }
    });

    setNewPin((prev) => ({
      ...prev,
      lat: coords.lat,
      lng: coords.lng,
      city:
        minDist < 0.8
          ? nearest.name
          : `Okolice ${nearest.name} (${coords.lat.toFixed(2)}, ${coords.lng.toFixed(2)})`,
    }));
  };

  const handleSelectCityPreset = (cityName) => {
    const found = DE_NL_CITIES.find((c) => c.name === cityName);
    if (found) {
      setNewPin((prev) => ({
        ...prev,
        city: found.name,
        lat: found.lat,
        lng: found.lng,
      }));
    }
  };

  const handleAddPin = (e) => {
    e.preventDefault();
    if (!newPin.city.trim()) {
      showToast('Podaj miasto lub kod pocztowy punktu.', 'error');
      return;
    }
    const created = {
      id: `pin-${Date.now()}`,
      type: newPin.type,
      city: newPin.city.trim(),
      description:
        newPin.description.trim() ||
        (newPin.type === 'pickup'
          ? 'Odbiór sprzętu audio'
          : 'Kierowca w trasie'),
      lat: Number(newPin.lat) || 51.5,
      lng: Number(newPin.lng) || 7.5,
      done: false,
      createdAt: todayStr,
    };
    setPins((prev) => [created, ...prev]);
    setSelectedPinId(created.id);
    setNewPin((prev) => ({ ...prev, description: '' }));
    showToast(`Dodano punkt na mapie: ${created.city}`);
  };

  const togglePinDone = (id) => {
    setPins((prev) =>
      prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p))
    );
  };

  const handleDeletePin = (id) => {
    setPins((prev) => prev.filter((p) => p.id !== id));
    if (selectedPinId === id) setSelectedPinId(null);
    showToast('Usunięto punkt z mapy.');
  };

  const getGoogleMapsPinUrl = (pin) => {
    const query = encodeURIComponent(`${pin.city} (${pin.lat},${pin.lng})`);
    return `https://www.google.com/maps/search/?api=1&query=${query}`;
  };

  const getAllPickupsRouteUrl = () => {
    const activePickups = pins.filter((p) => p.type === 'pickup' && !p.done);
    if (activePickups.length === 0) {
      return 'https://www.google.com/maps/@51.6,7.5,6z';
    }
    if (activePickups.length === 1) {
      return getGoogleMapsPinUrl(activePickups[0]);
    }
    const waypoints = activePickups
      .map((p) => encodeURIComponent(`${p.lat},${p.lng}`))
      .join('/');
    return `https://www.google.com/maps/dir/${waypoints}`;
  };

  const selectedPin =
    pins.find((p) => p.id === selectedPinId) || pins[0] || null;

  // ==========================================================================
  // AKCJE: PRZYCHODY INNE & SKUTECZNOŚĆ REKLAM
  // ==========================================================================
  const handleAddOtherIncome = (e) => {
    e.preventDefault();
    if (!newIncome.title.trim()) {
      showToast('Wpisz opis przychodu.', 'error');
      return;
    }
    const created = {
      id: `inc-${Date.now()}`,
      title: newIncome.title.trim(),
      source: newIncome.source,
      date: newIncome.date || todayStr,
      amount: Number(newIncome.amount) || 0,
      cost: Number(newIncome.cost) || 0,
    };
    setOtherIncomes((prev) => [created, ...prev]);
    setNewIncome({
      title: '',
      source: newIncome.source,
      date: newIncome.date || todayStr,
      amount: '',
      cost: '',
    });
    showToast('Dodano przychód dodatkowy.');
  };

  const handleDeleteOtherIncome = (id) => {
    setOtherIncomes((prev) => prev.filter((inc) => inc.id !== id));
    showToast('Usunięto wpis przychodu.');
  };

  const handleAddAd = (e) => {
    e.preventDefault();
    if (!newAd.title.trim()) {
      showToast('Wpisz nazwę reklamy lub ogłoszenia.', 'error');
      return;
    }
    const created = {
      id: `ad-${Date.now()}`,
      title: newAd.title.trim(),
      portal: newAd.portal,
      leads: Math.max(0, Number(newAd.leads) || 0),
      salesCount: Math.max(0, Number(newAd.salesCount) || 0),
      budget: Math.max(0, Number(newAd.budget) || 0),
      notes: newAd.notes.trim(),
    };
    setAds((prev) => [created, ...prev]);
    setNewAd({
      title: '',
      portal: newAd.portal,
      leads: '1',
      salesCount: '0',
      budget: '0',
      notes: '',
    });
    showToast('Dodano reklamę do zestawienia.');
  };

  const updateAdLeads = (id, delta) => {
    setAds((prev) =>
      prev.map((ad) =>
        ad.id === id ? { ...ad, leads: Math.max(0, ad.leads + delta) } : ad
      )
    );
  };

  const updateAdSales = (id, delta) => {
    setAds((prev) =>
      prev.map((ad) =>
        ad.id === id
          ? { ...ad, salesCount: Math.max(0, (ad.salesCount || 0) + delta) }
          : ad
      )
    );
  };

  const handleDeleteAd = (id) => {
    setAds((prev) => prev.filter((ad) => ad.id !== id));
    showToast('Usunięto reklamę.');
  };

  const adsSummary = useMemo(() => {
    const sortedAds = [...ads].sort((a, b) => b.leads - a.leads);
    const topAd = sortedAds[0] || null;
    const portalTotals = {};
    let totalLeads = 0;

    ads.forEach((ad) => {
      totalLeads += ad.leads;
      portalTotals[ad.portal] = (portalTotals[ad.portal] || 0) + ad.leads;
    });

    const portalRanking = Object.entries(portalTotals)
      .map(([portal, leads]) => ({ portal, leads }))
      .sort((a, b) => b.leads - a.leads);

    return { sortedAds, topAd, portalRanking, totalLeads };
  }, [ads]);

  // ==========================================================================
  // EKSPORT EXCEL (CSV) ORAZ KOPIA ZAPASOWA
  // ==========================================================================
  const copyTextToClipboard = (text, successMsg) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => showToast(successMsg))
        .catch(() => showToast('Skopiuj ręcznie zaznaczony tekst.', 'error'));
    } else {
      showToast('Twoja przeglądarka zablokowała schowek.', 'error');
    }
  };

  const handleExportCSV = () => {
    const lines = [
      'AUDIO KLASYKI - RAPORT FINANSOWY I MAGAZYNOWY',
      '',
      '1. SPRZET (KOLUMNY, WZMACNIACZE, INNE)',
      'Data;Nazwa;Kategoria;Kupno (zl);Naprawa (zl);Sprzedaz (zl);Zysk netto (zl);Status;Notatki',
    ];

    items.forEach((it) => {
      const isSold = it.sellPrice !== null && it.sellPrice !== '';
      const profit = isSold
        ? Number(it.sellPrice) - Number(it.buyPrice) - Number(it.repairCost)
        : 0;
      lines.push(
        [
          it.date || '',
          `"${(it.name || '').replace(/"/g, '""')}"`,
          it.category,
          it.buyPrice,
          it.repairCost,
          isSold ? it.sellPrice : '',
          isSold ? profit : '',
          isSold ? 'Sprzedane' : 'Na stanie',
          `"${(it.notes || '').replace(/"/g, '""')}"`,
        ].join(';')
      );
    });

    lines.push('', '2. PODSUMOWANIE MIESIECZNE');
    lines.push(
      'Miesiac;Kupno (zl);Naprawy (zl);Sprzedaz sprzetu (zl);Zysk ze sprzetu (zl);Inne przychody netto (zl);Laczny zysk (zl)'
    );
    monthlyBreakdown.forEach((m) => {
      lines.push(
        [
          m.label,
          m.buy,
          m.repair,
          m.sell,
          m.equipProfit,
          m.otherProfit,
          m.equipProfit + m.otherProfit,
        ].join(';')
      );
    });

    const csvContent = '\uFEFF' + lines.join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Audio_Klasyki_Raport_${todayStr}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast('Pobrano raport dla Excela (.csv)!');
  };

  const getFullBackupJson = () =>
    JSON.stringify({ items, pins, otherIncomes, ads }, null, 2);

  const handleImportBackup = () => {
    try {
      const parsed = JSON.parse(importText);
      if (Array.isArray(parsed.items)) setItems(parsed.items);
      if (Array.isArray(parsed.pins)) setPins(parsed.pins);
      if (Array.isArray(parsed.otherIncomes))
        setOtherIncomes(parsed.otherIncomes);
      if (Array.isArray(parsed.ads)) setAds(parsed.ads);
      setImportText('');
      setShowBackupModal(false);
      showToast('Pomyślnie wczytano dane z kopii zapasowej!');
    } catch {
      showToast('Nieprawidłowy format kodu kopii zapasowej.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      {/* POWIADOMIENIE TOAST */}
      {toast && (
        <div
          className={`fixed bottom-4 right-4 z-50 px-4 py-3 rounded-xl shadow-2xl border text-xs sm:text-sm font-medium flex items-center gap-2 transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950/95 border-rose-500 text-rose-100'
              : 'bg-emerald-950/95 border-emerald-500 text-emerald-100'
          }`}
        >
          <Icon name="check" className="w-4 h-4 shrink-0" />
          <span>{toast.message}</span>
        </div>
      )}

      {/* GÓRNY PASEK NAWIGACJI */}
      <header className="sticky top-0 z-30 bg-slate-900/95 backdrop-blur border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 py-3 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Logo i nazwa Audio Klasyki */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center text-slate-950 shadow-lg shadow-amber-500/20">
                <Icon name="speaker" className="w-6 h-6" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-extrabold tracking-tight text-white">
                  Audio Klasyki
                </h1>
                <p className="text-[11px] text-slate-400">
                  Magazyn Vintage • Logistyka DE/NL • Reklamy
                </p>
              </div>
            </div>
          </div>

          {/* Łączny zysk + Przesyłanie na telefon + Eksport */}
          <div className="flex items-center gap-2 sm:gap-2.5 flex-wrap">
            <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-right">
              <div className="text-[10px] uppercase tracking-wider text-slate-400">
                Łączny zysk netto
              </div>
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
              onClick={() =>
                copyTextToClipboard(
                  getShareableDataLink(),
                  'Skopiowano link z danymi! Wyślij go sobie na telefon (np. Messenger/WhatsApp) i otwórz.'
                )
              }
              className="px-3.5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-500/15 transition"
            >
              <Icon name="copy" className="w-4 h-4" />
              <span>Wyślij na telefon (Link)</span>
            </button>

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
              title="Kopia zapasowa"
              className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <Icon name="cloud" className="w-4 h-4 text-sky-400" />
              <span className="hidden md:inline">Kopia</span>
            </button>
          </div>
        </div>

        {/* GŁÓWNE ZAKŁADKI */}
        <div className="max-w-7xl mx-auto px-3 sm:px-6 pb-2.5 flex gap-2 overflow-x-auto">
          {[
            {
              id: 'inventory',
              label: 'Finanse i Magazyn',
              icon: 'speaker',
              badge: items.length,
            },
            {
              id: 'map',
              label: 'Mapa DE / NL',
              icon: 'map',
              badge: pins.filter((p) => !p.done).length,
            },
            {
              id: 'other',
              label: 'Przychody Inne (FB/OLX)',
              icon: 'dollar',
              badge: otherIncomes.length,
            },
            {
              id: 'ads',
              label: 'Skuteczność Reklam',
              icon: 'megaphone',
              badge: adsSummary.totalLeads,
            },
          ].map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold flex items-center gap-2 whitespace-nowrap transition ${
                  active
                    ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
                    : 'bg-slate-800/70 text-slate-300 hover:bg-slate-800 border border-slate-700/70'
                }`}
              >
                <Icon name={tab.icon} className="w-4 h-4" />
                <span>{tab.label}</span>
                <span
                  className={`px-1.5 py-0.5 rounded-md text-[11px] font-bold ${
                    active
                      ? 'bg-slate-950/20 text-slate-950'
                      : 'bg-slate-700 text-slate-300'
                  }`}
                >
                  {tab.badge}
                </span>
              </button>
            );
          })}
        </div>
      </header>

      {/* GŁÓWNA ZAWARTOŚĆ */}
      <main className="max-w-7xl mx-auto px-3 sm:px-6 pt-5 space-y-6">
        {/* ====================================================================
            ZAKŁADKA 1: FINANSE I MAGAZYN + ROZBICIE MIESIĄCE / LATA
           ==================================================================== */}
        {activeTab === 'inventory' && (
          <div className="space-y-5">
            {/* Pasek wyboru okresu (Rok / Miesiąc) oraz przełącznik Listy / Rozbicia */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-400 mr-1">
                  <Icon name="calendar" className="w-4 h-4" />
                  <span>Okres rozliczeniowy:</span>
                </div>

                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
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
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="ALL">Wszystkie miesiące</option>
                  {MONTH_NAMES_PL.map((mName, idx) => {
                    const mVal = String(idx + 1).padStart(2, '0');
                    return (
                      <option key={mVal} value={mVal}>
                        {mName}
                      </option>
                    );
                  })}
                </select>

                {(selectedYear !== 'ALL' || selectedMonth !== 'ALL') && (
                  <button
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

              {/* Przełącznik: Lista sprzętu vs Rozbicie na Miesiące i Lata */}
              <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800 self-start md:self-auto">
                <button
                  onClick={() => setInventorySubView('list')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    inventorySubView === 'list'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Lista sprzętu ({periodItems.length})
                </button>
                <button
                  onClick={() => setInventorySubView('breakdown')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                    inventorySubView === 'breakdown'
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Rozbicie: Miesiące i Lata
                </button>
              </div>
            </div>

            {/* Karty KPI dla wybranego okresu */}
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-xs text-slate-400">Sprzedaż (okres)</div>
                <div className="text-lg sm:text-xl font-bold text-white mt-1">
                  {periodStats.totalSell.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Sprzedanych szt.: {periodStats.soldCount}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-xs text-slate-400">Kupno sprzętu</div>
                <div className="text-lg sm:text-xl font-bold text-sky-400 mt-1">
                  {periodStats.totalBuy.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Kupionych szt.: {periodItems.length}
                </div>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-xs text-slate-400">Koszty napraw</div>
                <div className="text-lg sm:text-xl font-bold text-amber-400 mt-1">
                  {periodStats.totalRepair.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Części i serwis
                </div>
              </div>

              <div className="bg-slate-900 border border-emerald-500/30 rounded-2xl p-3.5">
                <div className="text-xs text-emerald-300">
                  Zysk na czysto (sprzęt)
                </div>
                <div
                  className={`text-lg sm:text-xl font-extrabold mt-1 ${
                    periodStats.realizedProfit >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {periodStats.realizedProfit >= 0 ? '+' : ''}
                  {periodStats.realizedProfit.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  + inne źródła: {periodStats.otherProfit.toLocaleString('pl-PL')} zł
                </div>
              </div>

              <div className="col-span-2 lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-3.5">
                <div className="text-xs text-slate-400">Na stanie (włożone)</div>
                <div className="text-lg sm:text-xl font-bold text-purple-300 mt-1">
                  {periodStats.stockValue.toLocaleString('pl-PL')} zł
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Czeka na klienta: {periodStats.stockCount} szt.
                </div>
              </div>
            </div>

            {/* WIDOK B: ROZBICIE NA MIESIĄCE I LATA */}
            {inventorySubView === 'breakdown' ? (
              <div className="space-y-6">
                {/* Tabela Roczna */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Icon name="trending" className="w-5 h-5 text-amber-400" />
                      Podsumowanie Roczne
                    </h2>
                    <span className="text-xs text-slate-400">
                      Kliknij rok, aby przefiltrować miesiące
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                          <th className="p-3">Rok</th>
                          <th className="p-3">Kupno</th>
                          <th className="p-3">Naprawy</th>
                          <th className="p-3">Sprzedaż</th>
                          <th className="p-3">Zysk (Sprzęt)</th>
                          <th className="p-3">Inne (FB/OLX)</th>
                          <th className="p-3 text-right">Łączny Zysk Netto</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {yearlyBreakdown.map((row) => {
                          const totalYearProfit =
                            row.equipProfit + row.otherProfit;
                          return (
                            <tr
                              key={row.year}
                              onClick={() => setSelectedYear(row.year)}
                              className="hover:bg-slate-800/50 cursor-pointer transition"
                            >
                              <td className="p-3 font-bold text-white">
                                Rok {row.year}
                                <div className="text-[11px] font-normal text-slate-400">
                                  Kupiono: {row.boughtCount} | Sprzedano:{' '}
                                  {row.soldCount}
                                </div>
                              </td>
                              <td className="p-3 text-sky-400 font-medium">
                                {row.buy.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="p-3 text-amber-400 font-medium">
                                {row.repair.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="p-3 text-white font-semibold">
                                {row.sell.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="p-3 text-emerald-400 font-semibold">
                                {row.equipProfit >= 0 ? '+' : ''}
                                {row.equipProfit.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="p-3 text-purple-300">
                                {row.otherProfit >= 0 ? '+' : ''}
                                {row.otherProfit.toLocaleString('pl-PL')} zł
                              </td>
                              <td
                                className={`p-3 text-right font-extrabold ${
                                  totalYearProfit >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {totalYearProfit >= 0 ? '+' : ''}
                                {totalYearProfit.toLocaleString('pl-PL')} zł
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Tabela Miesięczna */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="p-4 border-b border-slate-800 flex items-center justify-between">
                    <h2 className="text-base font-bold text-white flex items-center gap-2">
                      <Icon name="calendar" className="w-5 h-5 text-sky-400" />
                      Rozbicie na Miesiące
                    </h2>
                    <span className="text-xs text-slate-400">
                      Kliknij wybrany miesiąc, aby zobaczyć jego sprzęt
                    </span>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-950/70 text-slate-400 border-b border-slate-800">
                          <th className="p-3">Miesiąc</th>
                          <th className="p-3">Szt. (K / S)</th>
                          <th className="p-3">Kupno</th>
                          <th className="p-3">Naprawy</th>
                          <th className="p-3">Sprzedaż</th>
                          <th className="p-3">Zysk (Sprzęt)</th>
                          <th className="p-3">Inne</th>
                          <th className="p-3 text-right">Bilans gotówki</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {monthlyBreakdown.map((m) => {
                          const cashFlow =
                            m.sell + m.otherProfit - m.buy - m.repair;
                          return (
                            <tr
                              key={m.ym}
                              onClick={() => {
                                setSelectedYear(m.year);
                                setSelectedMonth(m.month);
                                setInventorySubView('list');
                              }}
                              className="hover:bg-slate-800/60 cursor-pointer transition"
                            >
                              <td className="p-3 font-semibold text-white">
                                {m.label}
                              </td>
                              <td className="p-3 text-slate-300">
                                {m.boughtCount} / {m.soldCount}
                              </td>
                              <td className="p-3 text-sky-400">
                                {m.buy.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="p-3 text-amber-400">
                                {m.repair.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="p-3 text-white font-semibold">
                                {m.sell.toLocaleString('pl-PL')} zł
                              </td>
                              <td
                                className={`p-3 font-bold ${
                                  m.equipProfit >= 0
                                    ? 'text-emerald-400'
                                    : 'text-rose-400'
                                }`}
                              >
                                {m.equipProfit >= 0 ? '+' : ''}
                                {m.equipProfit.toLocaleString('pl-PL')} zł
                              </td>
                              <td className="p-3 text-purple-300">
                                {m.otherProfit >= 0 ? '+' : ''}
                                {m.otherProfit.toLocaleString('pl-PL')} zł
                              </td>
                              <td
                                className={`p-3 text-right font-semibold ${
                                  cashFlow >= 0
                                    ? 'text-emerald-300'
                                    : 'text-slate-400'
                                }`}
                              >
                                {cashFlow >= 0 ? '+' : ''}
                                {cashFlow.toLocaleString('pl-PL')} zł
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
              /* WIDOK A: FORMULARZ DODAWANIA + TABELA SPRZĘTU */
              <div className="space-y-5">
                {/* Formularz dodawania */}
                <form
                  onSubmit={handleAddItem}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Icon name="plus" className="w-4 h-4 text-amber-400" />
                    Dodaj kupiony sprzęt (Kolumny / Wzmacniacz / Inne)
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-2.5">
                    <input
                      type="text"
                      placeholder="Model (np. Pioneer SA-9500)"
                      value={newItem.name}
                      onChange={(e) =>
                        setNewItem({ ...newItem, name: e.target.value })
                      }
                      className="lg:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />

                    <select
                      value={newItem.category}
                      onChange={(e) =>
                        setNewItem({ ...newItem, category: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="Kolumny">Kolumny</option>
                      <option value="Wzmacniacze">Wzmacniacze</option>
                      <option value="Inne">Inne</option>
                    </select>

                    <input
                      type="date"
                      value={newItem.date}
                      onChange={(e) =>
                        setNewItem({ ...newItem, date: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />

                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Kupno (zł)"
                      value={newItem.buyPrice}
                      onChange={(e) =>
                        setNewItem({ ...newItem, buyPrice: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />

                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Naprawa (zł)"
                      value={newItem.repairCost}
                      onChange={(e) =>
                        setNewItem({ ...newItem, repairCost: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />

                    <input
                      type="number"
                      min="0"
                      step="any"
                      placeholder="Sprzedaż (puste=stan)"
                      value={newItem.sellPrice}
                      onChange={(e) =>
                        setNewItem({ ...newItem, sellPrice: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type="text"
                      placeholder="Notatka (skąd kupione, zakres naprawy, stan wizualny...)"
                      value={newItem.notes}
                      onChange={(e) =>
                        setNewItem({ ...newItem, notes: e.target.value })
                      }
                      className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
                    >
                      <Icon name="plus" className="w-4 h-4" />
                      <span>Dodaj do tabeli</span>
                    </button>
                  </div>
                </form>

                {/* Pasek wyszukiwania i filtrów kategorii */}
                <div className="flex flex-col md:flex-row gap-2.5 justify-between">
                  <div className="relative flex-1 max-w-md">
                    <span className="absolute left-3 top-2.5 text-slate-400">
                      <Icon name="search" className="w-4 h-4" />
                    </span>
                    <input
                      type="text"
                      placeholder="Szukaj modelu lub notatki..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {['Wszystkie', 'Kolumny', 'Wzmacniacze', 'Inne'].map(
                      (cat) => (
                        <button
                          key={cat}
                          onClick={() => setCategoryFilter(cat)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                            categoryFilter === cat
                              ? 'bg-sky-500 text-slate-950'
                              : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
                          }`}
                        >
                          {cat}
                        </button>
                      )
                    )}

                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none"
                    >
                      <option value="Wszystkie">Status: Wszystkie</option>
                      <option value="Na stanie">Tylko Na stanie</option>
                      <option value="Sprzedane">Tylko Sprzedane</option>
                    </select>
                  </div>
                </div>

                {/* Tabela sprzętu */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs sm:text-sm">
                      <thead>
                        <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                          <th className="p-3">Data</th>
                          <th className="p-3">Sprzęt i notatka</th>
                          <th className="p-3">Kategoria</th>
                          <th className="p-3">Kupno</th>
                          <th className="p-3">Naprawa</th>
                          <th className="p-3">Sprzedaż</th>
                          <th className="p-3">Zysk netto</th>
                          <th className="p-3 text-right">Akcje</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/70">
                        {filteredItems.length === 0 ? (
                          <tr>
                            <td
                              colSpan={8}
                              className="p-8 text-center text-slate-400"
                            >
                              Brak pozycji spełniających wybrane kryteria.
                            </td>
                          </tr>
                        ) : (
                          filteredItems.map((item) => {
                            const isSold =
                              item.sellPrice !== null && item.sellPrice !== '';
                            const profit = isSold
                              ? Number(item.sellPrice) -
                                Number(item.buyPrice) -
                                Number(item.repairCost)
                              : null;
                            const isEditing = editingItemId === item.id;

                            return (
                              <tr
                                key={item.id}
                                className="hover:bg-slate-800/40 transition"
                              >
                                <td className="p-3 text-slate-400 whitespace-nowrap">
                                  {item.date}
                                </td>
                                <td className="p-3">
                                  <div className="font-bold text-white">
                                    {item.name}
                                  </div>
                                  {item.notes && (
                                    <div className="text-xs text-slate-400 mt-0.5">
                                      {item.notes}
                                    </div>
                                  )}
                                </td>
                                <td className="p-3">
                                  <span
                                    className={`px-2 py-0.5 rounded-md text-xs font-semibold ${
                                      item.category === 'Kolumny'
                                        ? 'bg-amber-500/15 text-amber-300 border border-amber-500/30'
                                        : item.category === 'Wzmacniacze'
                                        ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                                        : 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                                    }`}
                                  >
                                    {item.category}
                                  </span>
                                </td>
                                <td className="p-3 text-slate-200 whitespace-nowrap">
                                  {Number(item.buyPrice).toLocaleString('pl-PL')}{' '}
                                  zł
                                </td>
                                <td className="p-3 text-amber-300 whitespace-nowrap">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      value={editRepairValue}
                                      onChange={(e) =>
                                        setEditRepairValue(e.target.value)
                                      }
                                      className="w-20 bg-slate-950 border border-amber-500 rounded px-2 py-1 text-xs text-white"
                                    />
                                  ) : (
                                    `${Number(item.repairCost).toLocaleString(
                                      'pl-PL'
                                    )} zł`
                                  )}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {isEditing ? (
                                    <input
                                      type="number"
                                      placeholder="Kwota"
                                      value={editSellValue}
                                      onChange={(e) =>
                                        setEditSellValue(e.target.value)
                                      }
                                      className="w-24 bg-slate-950 border border-emerald-500 rounded px-2 py-1 text-xs text-white"
                                    />
                                  ) : isSold ? (
                                    <span className="font-semibold text-white">
                                      {Number(item.sellPrice).toLocaleString(
                                        'pl-PL'
                                      )}{' '}
                                      zł
                                    </span>
                                  ) : (
                                    <span className="px-2 py-0.5 rounded-full text-[11px] bg-slate-800 text-amber-300 border border-amber-500/30">
                                      Na stanie
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 whitespace-nowrap">
                                  {isSold ? (
                                    <span
                                      className={`font-extrabold ${
                                        profit >= 0
                                          ? 'text-emerald-400'
                                          : 'text-rose-400'
                                      }`}
                                    >
                                      {profit >= 0 ? '+' : ''}
                                      {profit.toLocaleString('pl-PL')} zł
                                    </span>
                                  ) : (
                                    <span className="text-slate-500 text-xs">
                                      —
                                    </span>
                                  )}
                                </td>
                                <td className="p-3 text-right whitespace-nowrap">
                                  <div className="inline-flex items-center gap-1.5">
                                    {isEditing ? (
                                      <button
                                        onClick={() => saveEditItem(item.id)}
                                        className="px-2.5 py-1 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs"
                                      >
                                        Zapisz
                                      </button>
                                    ) : (
                                      <button
                                        onClick={() => startEditItem(item)}
                                        title="Wpisz sprzedaż / edytuj naprawę"
                                        className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                                      >
                                        <Icon name="edit" className="w-4 h-4" />
                                      </button>
                                    )}
                                    <button
                                      onClick={() => handleDeleteItem(item.id)}
                                      title="Usuń pozycję"
                                      className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                                    >
                                      <Icon name="trash" className="w-4 h-4" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ====================================================================
            ZAKŁADKA 2: MAPA NIEMIEC I HOLANDII + GOOGLE MAPS
           ==================================================================== */}
        {activeTab === 'map' && (
          <div className="space-y-5">
            {/* Górny pasek akcji mapy */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Icon name="map" className="w-5 h-5 text-amber-400" />
                  Logistyka: Niemcy i Holandia + Mapy Google
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Kliknij dowolny punkt na mapie Niemiec lub Holandii, aby
                  oznaczyć odbiór towaru lub trasę kierowcy.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setMapMode('vector')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      mapMode === 'vector'
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Mapa DE / NL (Kliknij punkt)
                  </button>
                  <button
                    onClick={() => setMapMode('google')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      mapMode === 'google'
                        ? 'bg-sky-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Podgląd Map Google
                  </button>
                </div>

                <a
                  href={getAllPickupsRouteUrl()}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition"
                >
                  <Icon name="route" className="w-4 h-4" />
                  <span>Trasa wszystkich odbiorów w Google Maps</span>
                </a>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
              {/* Lewa kolumna: Interaktywna Mapa */}
              <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden flex flex-col">
                {mapMode === 'vector' ? (
                  <div className="relative bg-slate-950">
                    <svg
                      viewBox={`0 0 ${MAP_BOUNDS.width} ${MAP_BOUNDS.height}`}
                      onClick={handleVectorMapClick}
                      className="w-full h-auto cursor-crosshair select-none block"
                    >
                      {/* Tło morza */}
                      <rect
                        width={MAP_BOUNDS.width}
                        height={MAP_BOUNDS.height}
                        fill="#071120"
                      />

                      {/* Siatka współrzędnych */}
                      {[100, 200, 300, 400, 500, 600, 700].map((gx) => (
                        <line
                          key={`gx-${gx}`}
                          x1={gx}
                          y1={0}
                          x2={gx}
                          y2={MAP_BOUNDS.height}
                          stroke="#1e293b"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      ))}
                      {[100, 200, 300, 400, 500].map((gy) => (
                        <line
                          key={`gy-${gy}`}
                          x1={0}
                          y1={gy}
                          x2={MAP_BOUNDS.width}
                          y2={gy}
                          stroke="#1e293b"
                          strokeWidth="1"
                          strokeDasharray="4 4"
                        />
                      ))}

                      {/* Kontur Holandii (NL) */}
                      <polygon
                        points="125,220 215,155 268,165 265,245 235,305 180,350 95,345 75,295"
                        fill="#132a46"
                        stroke="#38bdf8"
                        strokeWidth="2.5"
                      />
                      <text
                        x="155"
                        y="255"
                        fill="#7dd3fc"
                        fontSize="16"
                        fontWeight="bold"
                        opacity="0.55"
                      >
                        HOLANDIA (NL)
                      </text>

                      {/* Kontur Niemiec (DE) */}
                      <polygon
                        points="268,165 375,85 450,95 530,130 695,150 735,280 650,360 725,470 670,565 440,585 335,555 270,460 225,380 235,305 265,245"
                        fill="#17253b"
                        stroke="#f59e0b"
                        strokeWidth="2.5"
                      />
                      <text
                        x="435"
                        y="330"
                        fill="#fcd34d"
                        fontSize="20"
                        fontWeight="bold"
                        opacity="0.45"
                      >
                        NIEMCY (DE)
                      </text>

                      {/* Główne miasta orientacyjne */}
                      {DE_NL_CITIES.map((city) => {
                        const pt = geoToSvg(city.lat, city.lng);
                        return (
                          <g key={city.name} opacity="0.75">
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="3.5"
                              fill="#94a3b8"
                            />
                            <text
                              x={pt.x + 6}
                              y={pt.y + 3}
                              fill="#cbd5e1"
                              fontSize="10"
                            >
                              {city.name.replace(' (DE)', '').replace(' (NL)', '')}
                            </text>
                          </g>
                        );
                      })}

                      {/* Podgląd miejsca klikniętego do dodania */}
                      {(() => {
                        const draftPt = geoToSvg(newPin.lat, newPin.lng);
                        return (
                          <g>
                            <circle
                              cx={draftPt.x}
                              cy={draftPt.y}
                              r="12"
                              fill="none"
                              stroke="#ffffff"
                              strokeWidth="2"
                              strokeDasharray="3 3"
                            />
                            <circle
                              cx={draftPt.x}
                              cy={draftPt.y}
                              r="4"
                              fill="#ffffff"
                            />
                          </g>
                        );
                      })()}

                      {/* Zapisane pinezki odbiorów i kierowców */}
                      {pins.map((pin) => {
                        const pt = geoToSvg(pin.lat, pin.lng);
                        const isPickup = pin.type === 'pickup';
                        const isSelected = selectedPin?.id === pin.id;
                        return (
                          <g
                            key={pin.id}
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setSelectedPinId(pin.id);
                            }}
                            className="cursor-pointer"
                            opacity={pin.done ? 0.45 : 1}
                          >
                            {isSelected && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="18"
                                fill={isPickup ? '#f59e0b' : '#38bdf8'}
                                opacity="0.28"
                              />
                            )}
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="9"
                              fill={isPickup ? '#f59e0b' : '#0ea5e9'}
                              stroke="#0f172a"
                              strokeWidth="2.5"
                            />
                            <text
                              x={pt.x}
                              y={pt.y + 3.5}
                              textAnchor="middle"
                              fill="#0f172a"
                              fontSize="10"
                              fontWeight="bold"
                            >
                              {isPickup ? 'O' : 'K'}
                            </text>
                          </g>
                        );
                      })}
                    </svg>

                    {/* Legenda na dole mapy */}
                    <div className="px-4 py-2.5 bg-slate-900/95 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5 text-amber-300 font-semibold">
                          <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" />
                          O = Odbiór towaru
                        </span>
                        <span className="flex items-center gap-1.5 text-sky-300 font-semibold">
                          <span className="w-3 h-3 rounded-full bg-sky-500 inline-block" />
                          K = Kierowca
                        </span>
                      </div>
                      <span className="text-slate-400">
                        Kliknij w dowolne miejsce na mapie, aby ustawić punkt
                      </span>
                    </div>
                  </div>
                ) : (
                  /* Osadzone Mapy Google */
                  <div className="flex flex-col h-[460px]">
                    <iframe
                      title="Podgląd Map Google"
                      className="w-full flex-1 border-0"
                      loading="lazy"
                      src={`https://maps.google.com/maps?q=${
                        selectedPin
                          ? `${selectedPin.lat},${selectedPin.lng}`
                          : '51.5,7.5'
                      }&z=7&output=embed`}
                    />
                    {selectedPin && (
                      <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                        <div>
                          <span className="font-bold text-white">
                            Wybrany punkt: {selectedPin.city}
                          </span>
                          <span className="text-slate-400 ml-2">
                            ({selectedPin.description})
                          </span>
                        </div>
                        <a
                          href={getGoogleMapsPinUrl(selectedPin)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-3 py-1.5 rounded-lg bg-sky-500 text-slate-950 font-bold whitespace-nowrap"
                        >
                          Otwórz w aplikacji Google Maps
                        </a>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Prawa kolumna: Formularz dodawania punktu + Lista punktów */}
              <div className="lg:col-span-5 space-y-4">
                <form
                  onSubmit={handleAddPin}
                  className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3"
                >
                  <div className="text-sm font-bold text-white flex items-center gap-2">
                    <Icon name="pin" className="w-4 h-4 text-amber-400" />
                    Dodaj punkt odbioru lub kierowcę
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setNewPin({ ...newPin, type: 'pickup' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                        newPin.type === 'pickup'
                          ? 'bg-amber-500/20 border-amber-500 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon name="pin" className="w-4 h-4" />
                      <span>Odbiór towaru</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNewPin({ ...newPin, type: 'driver' })}
                      className={`py-2 px-3 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border transition ${
                        newPin.type === 'driver'
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      <Icon name="truck" className="w-4 h-4" />
                      <span>Kierowca</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <select
                      onChange={(e) => handleSelectCityPreset(e.target.value)}
                      value=""
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-300 focus:outline-none focus:border-amber-500"
                    >
                      <option value="">Szybki wybór miasta DE/NL...</option>
                      {DE_NL_CITIES.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.name}
                        </option>
                      ))}
                    </select>

                    <input
                      type="text"
                      placeholder="Miasto / Kod pocztowy"
                      value={newPin.city}
                      onChange={(e) =>
                        setNewPin({ ...newPin, city: e.target.value })
                      }
                      className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <input
                    type="text"
                    placeholder="Co do odbioru / imię kierowcy i trasa..."
                    value={newPin.description}
                    onChange={(e) =>
                      setNewPin({ ...newPin, description: e.target.value })
                    }
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                  />

                  <button
                    type="submit"
                    className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm flex items-center justify-center gap-1.5 transition"
                  >
                    <Icon name="plus" className="w-4 h-4" />
                    <span>Zapisz punkt na mapie</span>
                  </button>
                </form>

                {/* Lista zapisanych punktów */}
                <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5 max-h-[420px] overflow-y-auto">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Zapisane punkty ({pins.length})
                  </div>

                  {pins.map((pin) => {
                    const isPickup = pin.type === 'pickup';
                    const mapsUrl = getGoogleMapsPinUrl(pin);
                    return (
                      <div
                        key={pin.id}
                        onClick={() => setSelectedPinId(pin.id)}
                        className={`p-3 rounded-xl border transition cursor-pointer ${
                          selectedPin?.id === pin.id
                            ? 'bg-slate-800/90 border-amber-500/60'
                            : 'bg-slate-950/80 border-slate-800 hover:border-slate-700'
                        } ${pin.done ? 'opacity-55' : ''}`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                  isPickup
                                    ? 'bg-amber-500/20 text-amber-300'
                                    : 'bg-sky-500/20 text-sky-300'
                                }`}
                              >
                                {isPickup ? 'Odbiór' : 'Kierowca'}
                              </span>
                              <span
                                className={`font-bold text-xs sm:text-sm ${
                                  pin.done
                                    ? 'line-through text-slate-400'
                                    : 'text-white'
                                }`}
                              >
                                {pin.city}
                              </span>
                            </div>
                            <p className="text-xs text-slate-300 mt-1">
                              {pin.description}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePinDone(pin.id);
                              }}
                              title="Oznacz jako odebrane / wykonane"
                              className={`p-1.5 rounded-lg ${
                                pin.done
                                  ? 'bg-emerald-500 text-slate-950'
                                  : 'bg-slate-800 text-slate-400 hover:text-emerald-400'
                              }`}
                            >
                              <Icon name="check" className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeletePin(pin.id);
                              }}
                              title="Usuń punkt"
                              className="p-1.5 rounded-lg bg-slate-800 text-slate-400 hover:text-rose-400"
                            >
                              <Icon name="trash" className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Przyciski Google Maps dla punktu */}
                        <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex flex-wrap gap-2">
                          <a
                            href={mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={(e) => e.stopPropagation()}
                            className="px-2.5 py-1 rounded-lg bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Icon name="external" className="w-3 h-3" />
                            <span>Otwórz w Mapach Google</span>
                          </a>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyTextToClipboard(
                                `Audio Klasyki - ${pin.city}: ${pin.description} | Nawigacja: ${mapsUrl}`,
                                'Skopiowano punkt i link Google Maps dla kierowcy!'
                              );
                            }}
                            className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] font-semibold flex items-center gap-1"
                          >
                            <Icon name="copy" className="w-3 h-3" />
                            <span>Wyślij kierowcy</span>
                          </button>
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
            ZAKŁADKA 3: PRZYCHODY INNE (NP. FACEBOOK, OLX, USŁUGI)
           ==================================================================== */}
        {activeTab === 'other' && (
          <div className="space-y-5">
            <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                  <Icon name="dollar" className="w-5 h-5 text-purple-400" />
                  Przychody z innych źródeł (Facebook, OLX, akcesoria, serwis)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Rejestruj dodatkową sprzedaż spoza głównej tabeli sprzętu.
                </p>
              </div>
              <div className="bg-purple-950/50 border border-purple-500/30 rounded-xl px-4 py-2 text-right">
                <div className="text-[11px] text-purple-300">
                  Suma zysku z innych źródeł
                </div>
                <div className="text-lg font-extrabold text-white">
                  +
                  {otherIncomes
                    .reduce(
                      (s, i) =>
                        s + ((Number(i.amount) || 0) - (Number(i.cost) || 0)),
                      0
                    )
                    .toLocaleString('pl-PL')}{' '}
                  zł
                </div>
              </div>
            </div>

            {/* Formularz dodawania innego przychodu */}
            <form
              onSubmit={handleAddOtherIncome}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5"
            >
              <input
                type="text"
                placeholder="Opis (np. Kable, maskownice, usługa)"
                value={newIncome.title}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, title: e.target.value })
                }
                className="lg:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              />

              <select
                value={newIncome.source}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, source: e.target.value })
                }
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              >
                <option value="Facebook Marketplace">Facebook Marketplace</option>
                <option value="Grupy Facebook">Grupy Facebook</option>
                <option value="OLX">OLX</option>
                <option value="Allegro">Allegro</option>
                <option value="Serwis / Transport">Serwis / Transport</option>
                <option value="Inne">Inne</option>
              </select>

              <input
                type="date"
                value={newIncome.date}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, date: e.target.value })
                }
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              />

              <input
                type="number"
                min="0"
                step="any"
                placeholder="Przychód (zł)"
                value={newIncome.amount}
                onChange={(e) =>
                  setNewIncome({ ...newIncome, amount: e.target.value })
                }
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
              />

              <div className="flex gap-2">
                <input
                  type="number"
                  min="0"
                  step="any"
                  placeholder="Koszt (zł)"
                  value={newIncome.cost}
                  onChange={(e) =>
                    setNewIncome({ ...newIncome, cost: e.target.value })
                  }
                  className="w-24 bg-slate-950 border border-slate-700 rounded-xl px-2.5 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-purple-500"
                />
                <button
                  type="submit"
                  className="flex-1 py-2 px-3 rounded-xl bg-purple-500 hover:bg-purple-400 text-slate-950 font-bold text-xs sm:text-sm"
                >
                  Dodaj
                </button>
              </div>
            </form>

            {/* Tabela innych przychodów */}
            <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs sm:text-sm">
                  <thead>
                    <tr className="bg-slate-950/80 text-slate-400 border-b border-slate-800">
                      <th className="p-3">Data</th>
                      <th className="p-3">Opis przychodu</th>
                      <th className="p-3">Źródło / Portal</th>
                      <th className="p-3">Przychód</th>
                      <th className="p-3">Koszt</th>
                      <th className="p-3">Zysk netto</th>
                      <th className="p-3 text-right">Usuń</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/70">
                    {otherIncomes.map((inc) => {
                      const net =
                        (Number(inc.amount) || 0) - (Number(inc.cost) || 0);
                      return (
                        <tr key={inc.id} className="hover:bg-slate-800/40">
                          <td className="p-3 text-slate-400">{inc.date}</td>
                          <td className="p-3 font-semibold text-white">
                            {inc.title}
                          </td>
                          <td className="p-3">
                            <span className="px-2 py-0.5 rounded-md bg-purple-500/15 text-purple-300 border border-purple-500/30 text-xs">
                              {inc.source}
                            </span>
                          </td>
                          <td className="p-3 text-white">
                            {Number(inc.amount).toLocaleString('pl-PL')} zł
                          </td>
                          <td className="p-3 text-slate-400">
                            {Number(inc.cost).toLocaleString('pl-PL')} zł
                          </td>
                          <td className="p-3 font-bold text-emerald-400">
                            +{net.toLocaleString('pl-PL')} zł
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => handleDeleteOtherIncome(inc.id)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
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
            ZAKŁADKA 4: SKUTECZNOŚĆ REKLAM
           ==================================================================== */}
        {activeTab === 'ads' && (
          <div className="space-y-5">
            {/* Lider skuteczności + Ranking portali */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-gradient-to-br from-amber-500/15 via-slate-900 to-slate-900 border border-amber-500/40 rounded-2xl p-4">
                <div className="text-xs uppercase tracking-wider font-bold text-amber-400 flex items-center gap-1.5">
                  <Icon name="megaphone" className="w-4 h-4" />
                  Najlepsza reklama (Lider zapytań)
                </div>
                {adsSummary.topAd ? (
                  <div className="mt-2">
                    <div className="text-lg font-extrabold text-white">
                      {adsSummary.topAd.title}
                    </div>
                    <div className="text-xs text-slate-300 mt-1">
                      Portal:{' '}
                      <span className="font-semibold text-amber-300">
                        {adsSummary.topAd.portal}
                      </span>{' '}
                      • Odezwało się:{' '}
                      <span className="font-bold text-emerald-400">
                        {adsSummary.topAd.leads} osób
                      </span>{' '}
                      • Sprzedaży: {adsSummary.topAd.salesCount || 0}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 mt-2">
                    Dodaj pierwszą reklamę poniżej.
                  </p>
                )}
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <div className="text-xs uppercase tracking-wider font-bold text-slate-400">
                  Skuteczność portali (suma odezwanych osób)
                </div>
                {adsSummary.portalRanking.map((p) => {
                  const pct =
                    adsSummary.totalLeads > 0
                      ? Math.round((p.leads / adsSummary.totalLeads) * 100)
                      : 0;
                  return (
                    <div key={p.portal} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-white">
                          {p.portal}
                        </span>
                        <span className="text-amber-300 font-bold">
                          {p.leads} osób ({pct}%)
                        </span>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-amber-500 rounded-full"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Formularz dodawania reklamy */}
            <form
              onSubmit={handleAddAd}
              className="bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2.5"
            >
              <input
                type="text"
                placeholder="Nazwa reklamy / ogłoszenia"
                value={newAd.title}
                onChange={(e) => setNewAd({ ...newAd, title: e.target.value })}
                className="lg:col-span-2 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              />

              <select
                value={newAd.portal}
                onChange={(e) => setNewAd({ ...newAd, portal: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              >
                <option value="Facebook Marketplace">Facebook Marketplace</option>
                <option value="Grupy Facebook">Grupy Facebook</option>
                <option value="Facebook Ads">Facebook Ads (Płatna)</option>
                <option value="OLX">OLX</option>
                <option value="Allegro">Allegro</option>
                <option value="Instagram">Instagram</option>
                <option value="Google">Google</option>
                <option value="TikTok">TikTok</option>
              </select>

              <input
                type="number"
                min="0"
                placeholder="Ile osób napisało"
                value={newAd.leads}
                onChange={(e) => setNewAd({ ...newAd, leads: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              />

              <input
                type="number"
                min="0"
                placeholder="Koszt reklamy (zł)"
                value={newAd.budget}
                onChange={(e) => setNewAd({ ...newAd, budget: e.target.value })}
                className="bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-xs sm:text-sm text-white focus:outline-none focus:border-amber-500"
              />

              <button
                type="submit"
                className="py-2 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs sm:text-sm"
              >
                Dodaj reklamę
              </button>
            </form>

            {/* Lista reklam z szybkim +1 osoba */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {adsSummary.sortedAds.map((ad, idx) => {
                const cpl =
                  ad.leads > 0 && ad.budget > 0
                    ? (ad.budget / ad.leads).toFixed(2)
                    : '0';
                return (
                  <div
                    key={ad.id}
                    className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between space-y-3"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2">
                        <span className="px-2.5 py-0.5 rounded-lg bg-sky-500/15 text-sky-300 border border-sky-500/30 text-xs font-semibold">
                          #{idx + 1} • {ad.portal}
                        </span>
                        <button
                          onClick={() => handleDeleteAd(ad.id)}
                          className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-950 text-slate-400 hover:text-rose-400"
                        >
                          <Icon name="trash" className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h3 className="text-sm sm:text-base font-bold text-white mt-2">
                        {ad.title}
                      </h3>
                      {ad.notes && (
                        <p className="text-xs text-slate-400 mt-1">{ad.notes}</p>
                      )}
                    </div>

                    <div className="space-y-2.5 pt-2 border-t border-slate-800">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="text-[11px] text-slate-400">
                            Odezwało się osób
                          </div>
                          <div className="text-xl font-extrabold text-emerald-400">
                            {ad.leads}
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => updateAdLeads(ad.id, -1)}
                            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs"
                          >
                            -1
                          </button>
                          <button
                            onClick={() => updateAdLeads(ad.id, 1)}
                            className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs shadow"
                          >
                            +1 osoba
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-between text-xs text-slate-400">
                        <span>
                          Sprzedaży: <strong className="text-white">{ad.salesCount || 0}</strong>{' '}
                          <button
                            onClick={() => updateAdSales(ad.id, 1)}
                            className="ml-1 px-1.5 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold"
                          >
                            +1
                          </button>
                        </span>
                        <span>
                          Budżet: {ad.budget} zł{' '}
                          {ad.budget > 0 && `(${cpl} zł/os.)`}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </main>

      {/* ======================================================================
          MODAL: PROSTA KOPIA ZAPASOWA (KOPIUJ / WKLEJ)
         ====================================================================== */}
      {showBackupModal && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl my-8">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Icon name="copy" className="w-5 h-5 text-amber-400" />
                Kopia zapasowa i przenoszenie na telefon
              </h3>
              <button
                onClick={() => setShowBackupModal(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                Zamknij ✕
              </button>
            </div>

            <div className="bg-emerald-950/40 border border-emerald-500/30 rounded-xl p-3.5 space-y-2 text-xs text-slate-300">
              <div className="font-bold text-emerald-300">
                Najszybszy sposób na telefon (1 kliknięcie):
              </div>
              <p>
                Kliknij przycisk poniżej, wyślij skopiowany link sobie na
                telefon (przez WhatsApp, Messenger lub e-mail) i otwórz go —
                wszystkie Twoje kolumny, punkty na mapie i reklamy od razu
                zapiszą się na telefonie.
              </p>
              <button
                onClick={() =>
                  copyTextToClipboard(
                    getShareableDataLink(),
                    'Skopiowano link z danymi! Otwórz go na telefonie.'
                  )
                }
                className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs sm:text-sm"
              >
                Skopiuj link z danymi na telefon
              </button>
            </div>

            <div className="pt-2 border-t border-slate-800 space-y-2">
              <div className="text-xs font-semibold text-slate-300">
                Ręczna kopia zapasowa (tekst):
              </div>
              <button
                onClick={() =>
                  copyTextToClipboard(
                    getFullBackupJson(),
                    'Skopiowano pełną kopię danych Audio Klasyki!'
                  )
                }
                className="w-full py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs sm:text-sm"
              >
                Skopiuj wszystkie dane do schowka
              </button>

              <textarea
                rows={3}
                placeholder='Wklej tutaj kod kopii zapasowej {"items": ...}'
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500"
              />
              <button
                onClick={handleImportBackup}
                className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs"
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
