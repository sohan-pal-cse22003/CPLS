export interface SeedSubcategory {
  name: string;
  price: number;
  time: string;
  description: string;
}

export interface SeedCategory {
  name: string;
  icon: string;
  description: string;
  subcategories: SeedSubcategory[];
}

export interface SeedProviderService {
  slug: string;
  price: number | null;
}

export interface SeedProvider {
  email: string;
  name: string;
  rating: number;
  isApproved: boolean;
  online: boolean;
  services: SeedProviderService[];
}

export const SEED_CATEGORIES: SeedCategory[] = [
  {
    name: 'Plumbing Services',
    icon: 'fa-wrench',
    description: 'Expert pipe repairs, leakages, and fitments',
    subcategories: [
      {
        name: 'Leakage Repair',
        price: 299,
        time: '1 hour',
        description: 'Fixing water pipe and tap leakages',
      },
      {
        name: 'Drain Cleaning',
        price: 499,
        time: '2 hours',
        description: 'Unclogging bathroom and kitchen drains',
      },
      {
        name: 'Tap & Shower Fitment',
        price: 199,
        time: '30 mins',
        description: 'Installing or replacing taps, showerheads, etc.',
      },
    ],
  },
  {
    name: 'Carpenter Services',
    icon: 'fa-hammer',
    description: 'Furniture repair, mounting, and wood installation',
    subcategories: [
      {
        name: 'Furniture Repair',
        price: 399,
        time: '1.5 hours',
        description: 'Repairing chairs, doors, tables, and cabinets',
      },
      {
        name: 'Door Installation',
        price: 799,
        time: '2 hours',
        description: 'Fitting new wooden or flush doors',
      },
      {
        name: 'Drill & Mounting',
        price: 149,
        time: '30 mins',
        description: 'Hanging TV, wall paintings, shelves, etc.',
      },
    ],
  },
  {
    name: 'Saloon (Grooming)',
    icon: 'fa-scissors',
    description: 'Haircuts, beard styling, and facials at home',
    subcategories: [
      {
        name: 'Classic Haircut',
        price: 199,
        time: '45 mins',
        description: 'Shampoo and premium haircut',
      },
      {
        name: 'Beard Grooming',
        price: 129,
        time: '30 mins',
        description: 'Trimming, shaving, and hot towel styling',
      },
      {
        name: 'Detox Facial',
        price: 599,
        time: '1 hour',
        description: 'Deep cleaning and skin rejuvenation treatment',
      },
    ],
  },
  {
    name: 'Electronics Repair',
    icon: 'fa-plug',
    description: 'Home appliances diagnostics and component repairs',
    subcategories: [
      {
        name: 'TV Repair & Mounting',
        price: 499,
        time: '1.5 hours',
        description: 'Repairing display, sound, or mounting TV',
      },
      {
        name: 'Washing Machine Repair',
        price: 699,
        time: '2 hours',
        description: 'Resolving spinning, water outlet, or motor issues',
      },
      {
        name: 'Ceiling Fan Repair',
        price: 199,
        time: '1 hour',
        description: 'Fixing fan speed, wiring, or motor replacement',
      },
    ],
  },
  {
    name: 'AC Services',
    icon: 'fa-snowflake',
    description: 'Jet servicing, gas refilling, and installations',
    subcategories: [
      {
        name: 'AC Jet Service',
        price: 449,
        time: '1 hour',
        description: 'Deep cleaning of filters and indoor/outdoor units',
      },
      {
        name: 'AC Repair & Gas Leakage',
        price: 1299,
        time: '2 hours',
        description: 'Detecting gas leaks, refilling, or repairing compressor',
      },
      {
        name: 'AC Installation',
        price: 999,
        time: '2.5 hours',
        description: 'Standard installation of split/window AC',
      },
    ],
  },
];

export const SEED_PROVIDERS: SeedProvider[] = [
  {
    email: 'provider@service.com',
    name: 'Rahul Sharma',
    rating: 4.8,
    isApproved: true,
    online: true,
    services: [
      { slug: 'door-installation', price: 50 },
      { slug: 'classic-haircut', price: 90 },
      { slug: 'leakage-repair', price: 250 },
      { slug: 'drain-cleaning', price: null },
      { slug: 'tap---shower-fitment', price: 220 },
    ],
  },
  {
    email: 'saloon_pro@service.com',
    name: 'Preeti Sen',
    rating: 4.9,
    isApproved: true,
    online: true,
    services: [
      { slug: 'door-installation', price: 500 },
      { slug: 'classic-haircut', price: 180 },
      { slug: 'beard-grooming', price: null },
      { slug: 'detox-facial', price: 550 },
    ],
  },
  {
    email: 'carp_pro@service.com',
    name: 'Jagdish Singh',
    rating: 0,
    isApproved: false,
    online: true,
    services: [
      { slug: 'furniture-repair', price: 380 },
      { slug: 'door-installation', price: null },
      { slug: 'drill---mounting', price: 130 },
    ],
  },
];
