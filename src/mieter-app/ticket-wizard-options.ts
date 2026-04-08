import type { TicketCategory } from "@prisma/client";
import {
  ChefHat, Bath, DoorOpen, BedDouble, Package, Sun, Building,
  WashingMachine, Archive, Triangle, Bike, Mailbox, HelpCircle,
  Refrigerator, Wind, Flame, CookingPot, Microwave, Droplets,
  RotateCcw, LayoutGrid, AlignJustify, Shirt, PanelTop, Square,
  Minus, Lightbulb, Plug, Thermometer, Wrench,
  type LucideIcon,
} from "lucide-react";

export type SubItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  category: TicketCategory;
  isAppliance?: boolean; // show brand + serial number fields
};

export type Room = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** undefined = direct to step 3 (no sub-item selection) */
  items?: SubItem[];
  /** true = show a free-text field for the room name */
  custom?: boolean;
};

// ── Shared sub-items used across multiple rooms ──────────────────────────────

const fenster: SubItem =   { id: "fenster",    label: "Fenster",              icon: LayoutGrid,   category: "FENSTER_TUEREN" };
const rollladen: SubItem = { id: "rollladen",  label: "Rollläden",            icon: AlignJustify, category: "FENSTER_TUEREN" };
const decke: SubItem =     { id: "decke",      label: "Decke",                icon: PanelTop,     category: "ALLGEMEIN" };
const waende: SubItem =    { id: "waende",     label: "Wände",                icon: Square,       category: "ALLGEMEIN" };
const boden: SubItem =     { id: "boden",      label: "Boden",                icon: Minus,        category: "ALLGEMEIN" };
const licht: SubItem =     { id: "licht",      label: "Licht",                icon: Lightbulb,    category: "ELEKTRO" };
const steckdosen: SubItem ={ id: "steckdosen", label: "Schalter / Steckdosen",icon: Plug,         category: "ELEKTRO" };
const heizung: SubItem =   { id: "heizung",    label: "Heizung",              icon: Thermometer,  category: "HEIZUNG" };
const anderes: SubItem =   { id: "anderes",    label: "Anderes",              icon: HelpCircle,   category: "SONSTIGES" };
const waschmaschine: SubItem = { id: "waschmaschine", label: "Waschmaschine", icon: WashingMachine, category: "ELEKTRO", isAppliance: true };
const tumbler: SubItem =   { id: "tumbler",    label: "Tumbler",              icon: RotateCcw,    category: "ELEKTRO", isAppliance: true };
const lavabo: SubItem =    { id: "lavabo",     label: "Lavabo",               icon: Droplets,     category: "SANITAER" };

// ── Rooms ────────────────────────────────────────────────────────────────────

export const ROOMS: Room[] = [
  {
    id: "kueche",
    label: "Küche",
    icon: ChefHat,
    items: [
      { id: "kuehlschrank",   label: "Kühlschrank",   icon: Refrigerator,  category: "ELEKTRO",  isAppliance: true },
      { id: "geschirrspueler",label: "Geschirrspüler",icon: WashingMachine,category: "ELEKTRO",  isAppliance: true },
      { id: "dampfabzug",     label: "Dampfabzug",    icon: Wind,          category: "ELEKTRO",  isAppliance: true },
      { id: "kochherd",       label: "Kochherd",      icon: Flame,         category: "ELEKTRO",  isAppliance: true },
      { id: "backofen",       label: "Backofen",      icon: Microwave,     category: "ELEKTRO",  isAppliance: true },
      { id: "spuelBecken",    label: "Spülbecken",    icon: Droplets,      category: "SANITAER" },
      fenster, rollladen, decke, waende, boden, licht, steckdosen, heizung, anderes,
    ],
  },
  {
    id: "bad",
    label: "Bad",
    icon: Bath,
    items: [
      waschmaschine,
      tumbler,
      { id: "badewanne",   label: "Badewanne / Dusche", icon: Bath,    category: "SANITAER" },
      { id: "wc",          label: "WC",                 icon: Wrench,  category: "SANITAER" },
      { id: "spiegelschrank", label: "Spiegelschrank",  icon: Square,  category: "ALLGEMEIN" },
      lavabo,
      fenster, rollladen, decke, waende, boden, licht, steckdosen, heizung, anderes,
    ],
  },
  {
    id: "korridor",
    label: "Korridor",
    icon: DoorOpen,
    items: [
      fenster,
      rollladen,
      { id: "garderobe", label: "Garderobe", icon: Shirt, category: "ALLGEMEIN" },
      decke, waende, boden, licht, steckdosen, heizung, anderes,
    ],
  },
  {
    id: "zimmer",
    label: "Zimmer",
    icon: BedDouble,
    items: [fenster, rollladen, decke, waende, boden, licht, steckdosen, heizung, anderes],
  },
  {
    id: "reduit",
    label: "Reduit",
    icon: Package,
    items: [
      waschmaschine,
      tumbler,
      { id: "lüftung", label: "Lüftung", icon: Wind, category: "ALLGEMEIN" },
      decke, waende, boden, licht, steckdosen, heizung, anderes,
    ],
  },
  {
    id: "balkon",
    label: "Balkon / Terrasse",
    icon: Sun,
    items: [
      { id: "sonnenstoren", label: "Sonnenstoren", icon: Sun, category: "ALLGEMEIN" },
      decke, waende, boden, licht, steckdosen, anderes,
    ],
  },
  {
    id: "treppenhaus",
    label: "Treppenhaus",
    icon: Building,
    items: [fenster, rollladen, decke, waende, boden, licht, steckdosen, heizung, anderes],
  },
  {
    id: "waschkueche",
    label: "Waschküche",
    icon: WashingMachine,
    items: [
      waschmaschine,
      tumbler,
      lavabo,
      decke, waende, boden, licht, steckdosen, heizung, anderes,
    ],
  },
  {
    id: "keller",
    label: "Keller",
    icon: Archive,
    // no items → direct to step 3
  },
  {
    id: "estrich",
    label: "Estrich",
    icon: Triangle,
    // no items → direct to step 3
  },
  {
    id: "veloraum",
    label: "Veloraum",
    icon: Bike,
    // no items → direct to step 3
  },
  {
    id: "briefkasten",
    label: "Briefkasten",
    icon: Mailbox,
    // no items → direct to step 3
  },
  {
    id: "anderer_raum",
    label: "Anderer Raum",
    icon: HelpCircle,
    custom: true,
    // step 2 = text input, then step 3
  },
];

export const APPLIANCE_IDS = new Set<string>([
  "kuehlschrank", "geschirrspueler", "dampfabzug", "kochherd", "backofen",
  "waschmaschine", "tumbler",
]);
