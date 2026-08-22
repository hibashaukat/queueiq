"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Booking,
  BookingState,
  Clinic,
  Department,
  Doctor,
  Organization,
  ScheduleBlock,
} from "../lib/types";
import {
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Clock3,
  Copy,
  Eye,
  EyeOff,
  HeartPulse,
  Landmark,
  MapPin,
  Menu,
  MessageCircle,
  MoreHorizontal,
  Phone,
  Search,
  ShoppingBag,
  Smartphone,
  Scissors,
  Ticket,
  UtensilsCrossed,
  X,
} from "lucide-react";
import {
  BUSINESS_ACCOUNTS,
  CATEGORY_MAP,
  CLINICS,
  DEPARTMENTS,
  DOCTORS_BY_DEPT,
  MOCK_RESULTS,
  STATUS_MAP,
} from "../lib/data";

const DAY_ABBR = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const EMERGENCY_TYPES = [
  "Chest Pain / Dil ka dard",
  "Accident / Chot",
  "High Fever",
  "Breathing Issue",
  "Uncontrolled Bleeding",
  "Severe Pain",
  "Other",
];
const EMERGENCY_MAX = 3;
const EXPRESS_MAX = 10;
const DEMO_ALWAYS_OPEN = true;

function parseTimeToMinutes(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

function formatMinutes(mins: number) {
  let h = Math.floor(mins / 60);
  const m = mins % 60;
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  return `${h}:${String(m).padStart(2, "0")} ${ampm}`;
}

function formatDateLabel(d: Date) {
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function roundUpTo30(mins: number) {
  return Math.ceil(mins / 30) * 30;
}

function generateToken(orgCode: string, isFuture = false) {
  const prefix = isFuture ? "F" : orgCode.charAt(0).toUpperCase();
  const num = Math.floor(100 + Math.random() * 899);
  return `${prefix}-${num}`;
}

function generateGenericToken(orgType: string, isFuture = false) {
  const prefixMap: Record<string, string> = {
    bank: "B",
    salon: "S",
    government: "G",
    lab: "L",
  };
  const prefix = isFuture ? "F" : prefixMap[orgType] || "T";
  const num = Math.floor(100 + Math.random() * 899);
  return `${prefix}-${num}`;
}

function tokenNum(label: string) {
  return parseInt(label.split("-")[1], 10) || 119;
}

function generateVoucherId(orgCode: string) {
  return `QI-${orgCode}-${Math.floor(10000 + Math.random() * 90000)}`;
}

function isValidPhone(code: string, raw: string) {
  const digits = (raw || "").replace(/\D/g, "");
  if (code === "+92") return /^03\d{9}$/.test(digits);
  return digits.length >= 8 && digits.length <= 15;
}

function computeClinicOpenStatus(clinic: Clinic) {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const openMin = parseTimeToMinutes(clinic.hours.open);
  const closeMin = parseTimeToMinutes(clinic.hours.close);
  const isOpen = DEMO_ALWAYS_OPEN || (nowMin >= openMin && nowMin < closeMin);
  return isOpen
    ? { open: true, text: `Open • Closes ${formatMinutes(closeMin)}` }
    : {
        open: false,
        text: `Closed • Opens Tomorrow ${formatMinutes(openMin)}`,
      };
}

function findNextScheduledDay(schedule: ScheduleBlock[]) {
  const today = new Date();
  const todayIdx = today.getDay();
  for (let i = 1; i <= 7; i++) {
    const idx = (todayIdx + i) % 7;
    const abbr = DAY_ABBR[idx];
    const block = schedule.find((b) => b.days.includes(abbr));
    if (block) {
      const label = i === 1 ? "Tomorrow" : abbr;
      return {
        abbr,
        block,
        label: `${label} ${formatMinutes(parseTimeToMinutes(block.start))}`,
      };
    }
  }
  return { label: "later this week" };
}

function computeDoctorStatus(doctor: Doctor, clinicOpen: boolean) {
  const now = new Date();
  const todayAbbr = DAY_ABBR[now.getDay()];
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const block = doctor.schedule.find((b: ScheduleBlock) =>
    b.days.includes(todayAbbr),
  );

  if (block) {
    const startMin = parseTimeToMinutes(block.start);
    const endMin = parseTimeToMinutes(block.end);
    if (clinicOpen && nowMin < endMin) {
      const nextSlot = Math.max(startMin, roundUpTo30(nowMin));
      return {
        level: "today-available",
        dot: "green",
        canBookToday: true,
        text: `Available Today • Next: ${formatMinutes(nextSlot)}`,
      };
    }
    const next = findNextScheduledDay(doctor.schedule);
    return {
      level: "today-over",
      dot: "yellow",
      canBookToday: false,
      text: `Slots over today • Next: ${next.label}`,
    };
  }

  const next = findNextScheduledDay(doctor.schedule);
  return {
    level: "not-today",
    dot: "grey",
    canBookToday: false,
    text: `Not available today • Next: ${next.label}`,
  };
}

function scheduleToText(schedule: ScheduleBlock[]) {
  return schedule
    .map(
      (b: ScheduleBlock) =>
        `${b.days.join(", ")} - ${formatMinutes(parseTimeToMinutes(b.start))} to ${formatMinutes(parseTimeToMinutes(b.end))}`,
    )
    .join(" | ");
}

function getClinicById(clinicId: string | undefined) {
  if (!clinicId) return undefined;
  return CLINICS[clinicId as keyof typeof CLINICS];
}

const categoryIcons = {
  Health: HeartPulse,
  Government: Landmark,
  Beauty: Scissors,
  Dining: UtensilsCrossed,
  Retail: ShoppingBag,
  Others: MoreHorizontal,
};

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [view, setView] = useState<"user" | "business">("user");
  const [showSwitchOverlay, setShowSwitchOverlay] = useState(false);
  const [isSwitching, setIsSwitching] = useState(false);
  const [switchTarget, setSwitchTarget] = useState<"user" | "business" | null>(
    null,
  );
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("rating");
  const [showBookingOverlay, setShowBookingOverlay] = useState(false);
  const [bookingState, setBookingState] = useState<BookingState | null>(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [contactTab, setContactTab] = useState<"patient" | "business">(
    "patient",
  );
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [businessEmail, setBusinessEmail] = useState("");
  const [businessPassword, setBusinessPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [bizError, setBizError] = useState("");
  const [currentBusiness, setCurrentBusiness] = useState<any>(null);
  const [businessQueue, setBusinessQueue] = useState<any[]>([]);
  const [businessDoctors, setBusinessDoctors] = useState<Doctor[]>([]);
  const [tokenSlotsUsed, setTokenSlotsUsed] = useState({
    emergency: 2,
    express: 9,
  });
  const [myBookings, setMyBookings] = useState<Booking[]>([]);
  const [bookingPhone, setBookingPhone] = useState("");
  const [bookingPhoneCode, setBookingPhoneCode] = useState("+92");
  const [bookingPhoneValid, setBookingPhoneValid] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [liveTokenInterval, setLiveTokenInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [reservationInterval, setReservationInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    issue: "",
    message: "",
  });
  const [businessContactForm, setBusinessContactForm] = useState({
    name: "",
    businessName: "",
    businessType: "",
    phone: "",
    email: "",
    city: "",
    volume: "",
    message: "",
  });
  const [paymentMethod, setPaymentMethod] = useState("JazzCash");
  const [txnId, setTxnId] = useState("");
  const [phoneInputFocused, setPhoneInputFocused] = useState(false);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const arr = [...MOCK_RESULTS].filter((org) =>
      org.name.toLowerCase().includes(q),
    );
    if (sortBy === "rating") arr.sort((a, b) => b.rating - a.rating);
    if (sortBy === "distance") arr.sort((a, b) => a.distance - b.distance);
    if (sortBy === "wait")
      arr.sort((a, b) => (a.wait ?? Infinity) - (b.wait ?? Infinity));
    return arr;
  }, [searchQuery, sortBy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const saved = localStorage.getItem("queueiq_my_bookings");
    if (saved) setMyBookings(JSON.parse(saved));
    const queue = localStorage.getItem("queueiq_queue_SHIF");
    if (queue) setBusinessQueue(JSON.parse(queue));
    else
      setBusinessQueue([
        {
          token: "A-14",
          phone: "0300-1234567",
          doctor: "Dr. Ayesha Khan",
          time: "10:15",
          status: "Done",
        },
        {
          token: "A-15",
          phone: "0301-2345678",
          doctor: "Dr. Ayesha Khan",
          time: "10:30",
          status: "Serving",
        },
        {
          token: "A-16",
          phone: "0302-3456789",
          doctor: "Dr. Rabia Hassan",
          time: "10:45",
          status: "Waiting",
        },
        {
          token: "A-17",
          phone: "0303-4567890",
          doctor: "Dr. Ayesha Khan",
          time: "11:00",
          status: "Waiting",
        },
      ]);
    const doctors = localStorage.getItem("queueiq_doctors_Al-Shifa Clinic");
    if (doctors) setBusinessDoctors(JSON.parse(doctors));
    else
      setBusinessDoctors([
        {
          name: "Dr. Ayesha Khan",
          specialty: "Cardiologist",
          fee: 1500,
          email: "dr.ayesha@alshifa.com",
        } as Doctor,
      ]);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem("queueiq_my_bookings", JSON.stringify(myBookings));
  }, [myBookings]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (view === "business") {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [view]);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 2400);
    return () => window.clearTimeout(t);
  }, [toast]);

  useEffect(() => {
    return () => {
      if (liveTokenInterval) clearInterval(liveTokenInterval);
      if (reservationInterval) clearInterval(reservationInterval);
    };
  }, [liveTokenInterval, reservationInterval]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSearchOverlay) closeSearch();
        else if (showBookingOverlay) closeBooking();
        else if (showContactModal) setShowContactModal(false);
        else if (showMyBookings) setShowMyBookings(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showSearchOverlay, showBookingOverlay, showContactModal, showMyBookings]);

  const closeAllOverlays = () => {
    setShowSearchOverlay(false);
    setShowBookingOverlay(false);
    setShowContactModal(false);
    setShowMyBookings(false);
  };

  const openSearch = (query = "") => {
    setSearchQuery(query);
    closeAllOverlays();
    setShowSearchOverlay(true);
    setTimeout(() => {
      const el = document.getElementById("overlaySearchInput");
      if (el) (el as HTMLInputElement).focus();
    }, 150);
  };

  const closeSearch = () => {
    closeAllOverlays();
  };

  const openBooking = (org: Organization) => {
    closeAllOverlays();
    setShowBookingOverlay(true);
    const clinicId = org.clinicId || null;
    setBookingState({
      flow: org.type === "clinic" ? "clinic" : "generic",
      org,
      clinicId,
      step:
        org.type === "clinic"
          ? "clinic-detail"
          : org.status === "closed"
            ? "g-date"
            : "g-category",
    });
    setBookingPhone("");
    setBookingPhoneCode("+92");
    setBookingPhoneValid(false);
  };

  const closeBooking = () => {
    if (liveTokenInterval) clearInterval(liveTokenInterval);
    if (reservationInterval) clearInterval(reservationInterval);
    closeAllOverlays();
    setBookingState(null);
    setBookingPhone("");
    setBookingPhoneValid(false);
  };

  const showToast = (message: string) => setToast(message);
  const handleBookToken = async () => {
    try {
      const res = await fetch("https://queueiq.vercel.app/api/tokens/book", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: "test-123",
          organization_id: "test-456",
          doctor_id: bookingState?.doctorId || undefined,
          slot_time: new Date().toISOString(),
          token_type: bookingState?.tokenType || "normal",
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        showToast(`Error: ${data.error || data.message || "Booking failed"}`);
        return null;
      }

      showToast(`Token booked! Position: ${data.queue_position ?? "N/A"}`);

      return data;
    } catch (error) {
      console.error(error);
      showToast("API connect nahi ho rahi");
      return null;
    }
  };

  const openMyBookings = () => {
    closeAllOverlays();
    setShowMyBookings(true);
  };

  const closeMyBookings = () => setShowMyBookings(false);

  const switchToBusiness = () => {
    setIsSwitching(true);
    setSwitchTarget("business");
    setShowSwitchOverlay(true);
    setMobileMenuOpen(false);
    setTimeout(() => {
      setView("business");
      setShowSwitchOverlay(false);
      setIsSwitching(false);
      setSwitchTarget(null);
      showToast("Switching to business view");
    }, 700);
  };

  const switchToUser = () => {
    setIsSwitching(true);
    setSwitchTarget("user");
    setShowSwitchOverlay(true);
    setTimeout(() => {
      setView("user");
      setShowSwitchOverlay(false);
      setIsSwitching(false);
      setSwitchTarget(null);
      showToast("Back to QueueIQ");
    }, 700);
  };

  const businessLogin = () => {
    const account =
      BUSINESS_ACCOUNTS[businessEmail as keyof typeof BUSINESS_ACCOUNTS];
    if (!account || account.password !== businessPassword) {
      setBizError("Invalid email or password.");
      showToast("Invalid email or password");
      return;
    }
    setBizError("");
    setCurrentBusiness({ email: businessEmail, ...account });
    setShowContactModal(false);
    if (typeof window !== "undefined") {
      const seed = localStorage.getItem("queueiq_queue_SHIF");
      if (seed) setBusinessQueue(JSON.parse(seed));
    }
  };

  const bizLogout = () => {
    setCurrentBusiness(null);
    setBusinessEmail("");
    setBusinessPassword("");
    setBizError("");
  };

  const saveBusinessQueue = (queue: any[]) => {
    setBusinessQueue(queue);
    if (typeof window !== "undefined")
      localStorage.setItem("queueiq_queue_SHIF", JSON.stringify(queue));
  };

  const handleQueueAction = (action: string, token: string) => {
    const queue = [...businessQueue];
    const row = queue.find((item) => item.token === token);
    if (!row) return;
    if (action === "call") {
      const prevServing = queue.find((item) => item.status === "Serving");
      if (prevServing) prevServing.status = "Done";
      row.status = "Serving";
      showToast(`Calling ${row.token}`);
    } else if (action === "done") {
      row.status = "Done";
      showToast(`${row.token} marked Done`);
    } else if (action === "skip") {
      row.status = "Skipped";
      showToast(`${row.token} skipped`);
    } else if (action === "callagain") {
      showToast(`WhatsApp alert sent to ${row.phone} (demo)`);
      return;
    }
    saveBusinessQueue(queue);
  };

  const addWalkInToken = () => {
    const queue = [...businessQueue];
    const token = generateToken("SHIF", false);
    queue.unshift({
      token,
      phone: "03XXXXXXXXX",
      doctor: "Front Desk",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      status: "Waiting",
    });
    saveBusinessQueue(queue);
    showToast(`Walk-in token ${token} added`);
  };

  const renderClinicDetail = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const status = computeClinicOpenStatus(clinic);
    return (
      <div>
        <h2 className="text-xl font-bold text-white">{clinic.name}</h2>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[#9CA3AF]">
          <span className="inline-flex items-center gap-1 text-[#F59E0B]">
            ⭐ {clinic.rating}
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {clinic.distance} km away
          </span>
        </div>
        <p className="mt-1 text-sm text-[#9CA3AF]">{clinic.address}</p>
        <span
          className={`mt-3 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${status.open ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]" : "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]"}`}
        >
          <span
            className={`h-1.5 w-1.5 rounded-full ${status.open ? "bg-[#10B981]" : "bg-[#EF4444]"}`}
          />
          {status.text}
        </span>
        <p className="mt-6 text-sm font-medium text-white">Departments</p>
        <div className="mt-3 grid grid-cols-2 gap-3">
          {clinic.departments.map((d: Department) => (
            <button
              key={d.id}
              type="button"
              onClick={() => {
                setBookingState({
                  ...bookingState,
                  deptId: d.id,
                  step: "doctor-list",
                  doctorListLoaded: false,
                });
              }}
              className="cat-btn flex flex-col items-start gap-1 rounded-xl px-4 py-3 text-left"
            >
              <span className="text-xl">{d.icon}</span>
              <span className="text-sm font-medium text-white">{d.name}</span>
              <span className="text-xs text-[#9CA3AF]">{d.count} doctors</span>
            </button>
          ))}
        </div>
      </div>
    );
  };

  const renderDoctorList = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const status = computeClinicOpenStatus(clinic);
    const dept = clinic.departments.find(
      (d: Department) => d.id === bookingState.deptId,
    );
    const deptDoctors =
      DOCTORS_BY_DEPT[bookingState.deptId as keyof typeof DOCTORS_BY_DEPT] ||
      [];
    let doctors = deptDoctors.map((doc: Doctor) => ({
      doc,
      status: computeDoctorStatus(doc, status.open),
    }));
    if (bookingState.doctorSearch) {
      const q = bookingState.doctorSearch.toLowerCase();
      doctors = doctors.filter((x: { doc: Doctor }) =>
        x.doc.name.toLowerCase().includes(q),
      );
    }
    const rank: Record<string, number> = {
      "today-available": 0,
      "today-over": 1,
      "not-today": 2,
    };
    if (bookingState.doctorSort === "today")
      doctors.sort(
        (a: { status: { level: string } }, b: { status: { level: string } }) =>
          rank[a.status.level] - rank[b.status.level],
      );
    if (bookingState.doctorSort === "rating")
      doctors.sort(
        (a: { doc: Doctor }, b: { doc: Doctor }) => b.doc.rating - a.doc.rating,
      );
    if (bookingState.doctorSort === "experience")
      doctors.sort(
        (a: { doc: Doctor }, b: { doc: Doctor }) =>
          b.doc.experience - a.doc.experience,
      );
    return (
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
            <input
              id="doctorSearchInput"
              value={bookingState.doctorSearch || ""}
              onChange={(e) =>
                setBookingState({
                  ...bookingState,
                  doctorSearch: e.target.value,
                })
              }
              placeholder="Search doctor by name..."
              className="w-full rounded-lg border border-[#374151] bg-[#111827] py-2 pl-9 pr-3 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
            />
          </div>
          <select
            id="doctorSortSelect"
            value={bookingState.doctorSort || "today"}
            onChange={(e) =>
              setBookingState({ ...bookingState, doctorSort: e.target.value })
            }
            className="rounded-lg border border-[#374151] bg-[#111827] py-2 px-2 text-xs text-white focus:border-[#10B981] focus:outline-none"
          >
            <option value="today">Available Today First</option>
            <option value="rating">Rating</option>
            <option value="experience">Experience</option>
          </select>
        </div>
        <div className="mt-4 space-y-3">
          {doctors.map(
            ({
              doc,
              status,
            }: {
              doc: Doctor;
              status: { text: string; canBookToday: boolean };
            }) => (
              <div
                key={doc.id}
                className="rounded-xl border border-[#374151] bg-[#111827] p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">
                      {doc.name}
                    </p>
                    <p className="mt-0.5 text-xs text-[#9CA3AF]">
                      {doc.specialty} | {doc.experience} years exp | ⭐{" "}
                      {doc.rating} ({doc.reviews} reviews)
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="text-xs font-semibold text-white">
                      Rs. {doc.fee}
                    </p>
                  </div>
                </div>
                <p className="mt-2 text-xs text-[#9CA3AF]">
                  {scheduleToText(doc.schedule)}
                </p>
                <div className="mt-2 flex items-center gap-1.5 text-xs font-medium text-[#10B981]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  {status.text}
                </div>
                <button
                  type="button"
                  onClick={() =>
                    setBookingState({
                      ...bookingState,
                      doctorId: doc.id,
                      step: status.canBookToday ? "token-type" : "future-date",
                    })
                  }
                  className={`mt-3 w-full rounded-lg py-2 text-sm font-semibold text-[#111827] transition ${status.canBookToday ? "bg-[#10B981] hover:bg-[#10B981]/90" : "border border-[#374151] bg-transparent text-[#9CA3AF] hover:border-[#10B981]/50 hover:text-white"}`}
                >
                  {status.canBookToday
                    ? "Book Today Token"
                    : "Book Future Appointment"}
                </button>
              </div>
            ),
          )}
        </div>
      </div>
    );
  };

  const renderFutureAppointment = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const deptDoctors: Doctor[] =
      DOCTORS_BY_DEPT[bookingState.deptId as keyof typeof DOCTORS_BY_DEPT] ||
      [];
    const doc = deptDoctors.find((d: Doctor) => d.id === bookingState.doctorId);
    const minDate = new Date();
    minDate.setDate(minDate.getDate() + 1);
    const minDateValue = minDate.toISOString().split("T")[0];
    const selectedDate = bookingState.futureDate || minDateValue;
    return (
      <div>
        <p className="text-sm text-[#9CA3AF]">
          {doc?.name} — Future Appointment
        </p>
        <div className="mt-4 rounded-xl border border-[#374151] bg-[#111827] p-4">
          <label className="block text-sm font-medium text-white">
            Select a preferred date
          </label>
          <input
            type="date"
            min={minDateValue}
            value={selectedDate}
            onChange={(e) =>
              setBookingState({ ...bookingState, futureDate: e.target.value })
            }
            className="mt-2 w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2.5 text-sm text-white focus:border-[#10B981] focus:outline-none"
          />
        </div>
        <div className="mt-4 rounded-xl border border-[#374151] bg-[#111827] p-4 text-sm text-[#9CA3AF]">
          <p className="font-medium text-white">{clinic.name}</p>
          <p className="mt-1">
            Your request will be saved for {doc?.name} on {selectedDate}.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            const futureBooking: Booking = {
              voucherId: `FUT-${clinic.orgCode}-${Date.now().toString().slice(-4)}`,
              yourToken: generateToken(clinic.orgCode, true),
              orgName: clinic.name,
              category: doc?.name || "",
              phone: `${bookingPhoneCode} ${bookingPhone}`,
              date: selectedDate,
              paymentStatus: "Pending",
              tokenType: "future",
            };
            setMyBookings([...myBookings, futureBooking]);
            closeBooking();
            showToast("Future appointment request saved");
          }}
          className="mt-5 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
        >
          Confirm Future Appointment
        </button>
      </div>
    );
  };

  const renderTokenType = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const deptDoctors: Doctor[] =
      DOCTORS_BY_DEPT[bookingState.deptId as keyof typeof DOCTORS_BY_DEPT] ||
      [];
    const doc = deptDoctors.find((d: Doctor) => d.id === bookingState.doctorId);
    const emergencyFull = tokenSlotsUsed.emergency >= EMERGENCY_MAX;
    const expressFull = tokenSlotsUsed.express >= EXPRESS_MAX;
    return (
      <div>
        <p className="text-sm text-[#9CA3AF]">
          {doc?.name} — {doc?.specialty}
        </p>
        <div className="mt-4 space-y-3">
          <button
            type="button"
            onClick={() => {
              setBookingState({
                ...bookingState,
                tokenType: "normal",
                step: "contact-voucher",
              });
              setBookingPhone("");
              setBookingPhoneValid(false);
            }}
            className="token-card w-full rounded-xl p-4 text-left"
          >
            <div className="flex items-center justify-between">
              <p className="font-semibold text-white">Normal Token</p>
              <p className="text-sm font-bold text-[#10B981]">Rs. 800</p>
            </div>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Regular queue • Avg 40 min wait • Your token:{" "}
              {generateToken(clinic.orgCode, false)}
            </p>
          </button>
          <button
            type="button"
            disabled={expressFull}
            onClick={() => {
              setBookingState({
                ...bookingState,
                tokenType: "express",
                step: "contact-voucher",
              });
              setBookingPhone("");
              setBookingPhoneValid(false);
            }}
            className={`token-card w-full rounded-xl p-4 text-left ${expressFull ? "disabled" : ""}`}
          >
            <div className="flex items-center justify-between">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                Express Token{" "}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${expressFull ? "bg-[#374151] text-[#9CA3AF]" : "bg-[#10B981]/15 text-[#10B981]"}`}
                >
                  {expressFull
                    ? `FULL (${tokenSlotsUsed.express}/${EXPRESS_MAX})`
                    : "2x FASTER"}
                </span>
              </p>
              <p className="text-sm font-bold text-[#10B981]">Rs. 1200</p>
            </div>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Skip 50% of queue • Avg 15 min wait • Limited {EXPRESS_MAX}/day
            </p>
          </button>
          <button
            type="button"
            disabled={emergencyFull}
            onClick={() => {
              setBookingState({
                ...bookingState,
                tokenType: "emergency",
                step: "emergency-form",
              });
              setBookingPhone("");
              setBookingPhoneValid(false);
            }}
            className={`token-card emergency w-full rounded-xl p-4 text-left ${emergencyFull ? "disabled" : ""}`}
          >
            <div className="flex items-center justify-between">
              <p className="flex flex-wrap items-center gap-2 font-semibold text-white">
                Emergency Token{" "}
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${emergencyFull ? "bg-[#374151] text-[#9CA3AF]" : "bg-[#EF4444]/15 text-[#EF4444]"}`}
                >
                  {emergencyFull
                    ? `FULL (${tokenSlotsUsed.emergency}/${EMERGENCY_MAX})`
                    : `PRIORITY • LIMITED ${EMERGENCY_MAX}/DAY`}
                </span>
              </p>
              <p className="text-sm font-bold text-[#EF4444]">Rs. 1800</p>
            </div>
            <p className="mt-1 text-xs text-[#9CA3AF]">
              Immediate • Verification required
            </p>
          </button>
        </div>
      </div>
    );
  };

  const renderEmergencyForm = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const deptDoctors: Doctor[] =
      DOCTORS_BY_DEPT[bookingState.deptId as keyof typeof DOCTORS_BY_DEPT] ||
      [];
    const doc = deptDoctors.find((d: Doctor) => d.id === bookingState.doctorId);
    return (
      <div>
        <p className="text-sm text-[#9CA3AF]">
          {doc?.name} — {doc?.specialty}
        </p>
        <div className="mt-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-white">
              Emergency Type *
            </label>
            <select
              value={bookingState.emergencyType || ""}
              onChange={(e) =>
                setBookingState({
                  ...bookingState,
                  emergencyType: e.target.value,
                })
              }
              className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white focus:border-[#10B981] focus:outline-none"
            >
              <option value="">Select type...</option>
              {EMERGENCY_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-white">
              Describe emergency reason in detail *
            </label>
            <textarea
              rows={3}
              value={bookingState.emergencyDesc || ""}
              onChange={(e) =>
                setBookingState({
                  ...bookingState,
                  emergencyDesc: e.target.value,
                })
              }
              className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
              placeholder="e.g. Patient has severe chest pain for 2 hours, BP 180/110"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-white">
              WhatsApp Number *
            </label>
            <div className="mt-1.5 flex gap-2">
              <select
                value={bookingPhoneCode}
                onChange={(e) => setBookingPhoneCode(e.target.value)}
                className="rounded-lg border border-[#374151] bg-[#111827] px-2 py-2.5 text-sm text-white"
              >
                <option value="+92">🇵🇰 +92</option>
                <option value="+971">🇦🇪 +971</option>
                <option value="+44">🇬🇧 +44</option>
                <option value="+1">🇺🇸 +1</option>
              </select>
              <input
                value={bookingPhone}
                onBlur={() => setPhoneInputFocused(false)}
                onFocus={() => setPhoneInputFocused(true)}
                onChange={(e) => {
                  setBookingPhone(e.target.value);
                  setBookingPhoneValid(
                    isValidPhone(bookingPhoneCode, e.target.value),
                  );
                }}
                className="flex-1 rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                placeholder="03XXXXXXXXX"
              />
            </div>
          </div>
          <label className="flex items-start gap-2 text-xs text-[#9CA3AF]">
            <input
              type="checkbox"
              checked={bookingState.emergencyConfirm || false}
              onChange={(e) =>
                setBookingState({
                  ...bookingState,
                  emergencyConfirm: e.target.checked,
                })
              }
              className="mt-0.5 h-4 w-4 rounded border-[#374151] bg-[#111827] accent-[#10B981]"
            />
            I confirm this is a real medical emergency.
          </label>
          <button
            type="button"
            disabled={
              !bookingState.emergencyType ||
              !bookingState.emergencyDesc ||
              !bookingPhoneValid ||
              !bookingState.emergencyConfirm
            }
            onClick={() => {
              const voucher = {
                voucherId: generateVoucherId(clinic.orgCode),
                yourToken: generateToken(clinic.orgCode, false),
                currentTokenNum: 12,
                yourTokenNum: 16,
                paymentStatus: "pending_verification",
                tokenType: "emergency",
                phone: `${bookingPhoneCode} ${bookingPhone}`,
              };
              const nextBookings: Booking[] = [
                ...myBookings,
                {
                  ...voucher,
                  orgName: clinic.name,
                  category: doc?.specialty || "",
                  phone: `${bookingPhoneCode} ${bookingPhone}`,
                  date: "Today",
                },
              ];
              setMyBookings(nextBookings);
              setBookingState({ ...bookingState, voucher, step: "live-token" });
              setTokenSlotsUsed((prev) => ({
                ...prev,
                emergency: prev.emergency + 1,
              }));
              showToast("Emergency verification submitted");
            }}
            className="w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90 disabled:cursor-not-allowed disabled:bg-[#374151] disabled:text-[#9CA3AF]"
          >
            Submit for Verification
          </button>
        </div>
      </div>
    );
  };

  const renderContactVoucher = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const deptDoctors: Doctor[] =
      DOCTORS_BY_DEPT[bookingState.deptId as keyof typeof DOCTORS_BY_DEPT] ||
      [];
    const doc = deptDoctors.find((d: Doctor) => d.id === bookingState.doctorId);
    const amount = bookingState.tokenType === "express" ? 1200 : 800;
    const tokenLabel = generateToken(clinic.orgCode, false);
    return (
      <div>
        <p className="text-sm text-[#9CA3AF]">
          {doc?.name} —{" "}
          {bookingState.tokenType === "express" ? "Express" : "Normal"} Token •
          Rs. {amount}
        </p>
        <div className="mt-4 flex gap-2 border-b border-[#374151] pb-3">
          <button
            type="button"
            onClick={() =>
              setBookingState({ ...bookingState, paymentTab: "online" })
            }
            className={`flex-1 rounded-lg py-2 text-xs font-semibold leading-tight transition ${bookingState.paymentTab === "online" ? "bg-[#10B981] text-[#111827]" : "border border-[#374151] text-[#9CA3AF] hover:text-white"}`}
          >
            Pay Online
          </button>
          <button
            type="button"
            onClick={() =>
              setBookingState({ ...bookingState, paymentTab: "reception" })
            }
            className={`flex-1 rounded-lg py-2 text-xs font-semibold leading-tight transition ${bookingState.paymentTab === "reception" ? "bg-[#10B981] text-[#111827]" : "border border-[#374151] text-[#9CA3AF] hover:text-white"}`}
          >
            Pay at Reception
            <br className="sm:hidden" />
            <span className="hidden sm:inline"> - </span>No Account Needed
          </button>
        </div>
        <div className="mt-4">
          {bookingState.paymentTab === "online" ? (
            <div>
              <div className="flex gap-2">
                {["jazzcash", "bank", "card"].map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    onClick={() =>
                      setBookingState({ ...bookingState, paymentSubTab: tab })
                    }
                    className={`flex-1 rounded-lg border py-2 text-[10px] sm:text-[11px] font-medium transition ${bookingState.paymentSubTab === tab ? "border-[#10B981] text-[#10B981] bg-[#10B981]/10" : "border-[#374151] text-[#9CA3AF] hover:text-white"}`}
                  >
                    {tab === "jazzcash" ? (
                      <>
                        <span className="sm:hidden">JazzCash</span>
                        <span className="hidden sm:inline">
                          JazzCash / EasyPaisa
                        </span>
                      </>
                    ) : tab === "bank" ? (
                      "Bank Transfer"
                    ) : (
                      <>
                        <span className="sm:hidden">Card</span>
                        <span className="hidden sm:inline">
                          Card / Apple Pay
                        </span>
                      </>
                    )}
                  </button>
                ))}
              </div>
              <div className="mt-4 rounded-xl border border-[#374151] bg-[#111827] p-4 text-xs">
                <p className="text-sm font-semibold text-white">
                  WhatsApp Number *
                </p>
                <div className="mt-2 flex gap-2">
                  <select
                    value={bookingPhoneCode}
                    onChange={(e) => setBookingPhoneCode(e.target.value)}
                    className="rounded-lg border border-[#374151] bg-[#111827] px-2 py-2.5 text-sm text-white"
                  >
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input
                    value={bookingPhone}
                    onChange={(e) => {
                      setBookingPhone(e.target.value);
                      setBookingPhoneValid(
                        isValidPhone(bookingPhoneCode, e.target.value),
                      );
                    }}
                    className="flex-1 rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                    placeholder="03XXXXXXXXX"
                  />
                </div>
                <button
                  type="button"
                  disabled={!bookingPhoneValid}
                  onClick={() => {
                    const voucher = {
                      voucherId: generateVoucherId(clinic.orgCode),
                      yourToken: tokenLabel,
                      currentTokenNum: Math.max(2, tokenNum(tokenLabel) - 4),
                      yourTokenNum: tokenNum(tokenLabel),
                      paymentStatus: "unpaid",
                      tokenType: bookingState.tokenType,
                      method: "jazzcash",
                      phone: `${bookingPhoneCode} ${bookingPhone}`,
                    };
                    const nextBookings: Booking[] = [
                      ...myBookings,
                      {
                        ...voucher,
                        orgName: clinic.name,
                        category: doc?.name || "",
                        phone: `${bookingPhoneCode} ${bookingPhone}`,
                        date: "Today",
                      },
                    ];
                    setMyBookings(nextBookings);
                    setBookingState({
                      ...bookingState,
                      voucher,
                      step: "voucher-status",
                    });
                    if (bookingState.tokenType === "express")
                      setTokenSlotsUsed((prev) => ({
                        ...prev,
                        express: prev.express + 1,
                      }));
                    showToast("Voucher generated");
                  }}
                  className="mt-4 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90 disabled:cursor-not-allowed disabled:bg-[#374151] disabled:text-[#9CA3AF]"
                >
                  Generate Voucher ID
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="rounded-xl border border-[#374151] bg-[#111827] p-4">
                <p className="text-sm font-semibold text-white">
                  Rs. 0 now, pay Rs. {amount} at reception.
                </p>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  No bank account needed.
                </p>
              </div>
              <div className="mt-3">
                <label className="block text-sm font-medium text-white">
                  WhatsApp Number *
                </label>
                <div className="mt-1.5 flex gap-2">
                  <select
                    value={bookingPhoneCode}
                    onChange={(e) => setBookingPhoneCode(e.target.value)}
                    className="rounded-lg border border-[#374151] bg-[#111827] px-2 py-2.5 text-sm text-white"
                  >
                    <option value="+92">🇵🇰 +92</option>
                    <option value="+971">🇦🇪 +971</option>
                    <option value="+44">🇬🇧 +44</option>
                    <option value="+1">🇺🇸 +1</option>
                  </select>
                  <input
                    value={bookingPhone}
                    onChange={(e) => {
                      setBookingPhone(e.target.value);
                      setBookingPhoneValid(
                        isValidPhone(bookingPhoneCode, e.target.value),
                      );
                    }}
                    className="flex-1 rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                    placeholder="03XXXXXXXXX"
                  />
                </div>
              </div>
              <label className="mt-3 flex items-start gap-2 text-xs text-[#9CA3AF]">
                <input
                  type="checkbox"
                  checked={bookingState.receptionAgree || false}
                  onChange={(e) =>
                    setBookingState({
                      ...bookingState,
                      receptionAgree: e.target.checked,
                    })
                  }
                  className="mt-0.5 h-4 w-4 rounded border-[#374151] bg-[#111827] accent-[#10B981]"
                />
                I will pay within 20 mins
              </label>
              <button
                type="button"
                disabled={!bookingPhoneValid || !bookingState.receptionAgree}
                onClick={async () => {
                  const apiResult = await handleBookToken();

                  if (!apiResult) return;

                  const voucher = {
                    voucherId: generateVoucherId(clinic.orgCode),
                    yourToken: tokenLabel,
                    currentTokenNum: Math.max(2, tokenNum(tokenLabel) - 4),
                    yourTokenNum: tokenNum(tokenLabel),
                    paymentStatus: "reserved_unpaid",
                    tokenType: bookingState.tokenType,
                    method: "reception",
                    phone: `${bookingPhoneCode} ${bookingPhone}`,
                    reservedAt: Date.now(),
                    reserveWindowSec: 20 * 60,
                  };

                  const nextBookings: Booking[] = [
                    ...myBookings,
                    {
                      ...voucher,
                      orgName: clinic.name,
                      category: doc?.name || "",
                      phone: `${bookingPhoneCode} ${bookingPhone}`,
                      date: "Today",
                    },
                  ];

                  setMyBookings(nextBookings);

                  setBookingState({
                    ...bookingState,
                    voucher,
                    step: "live-token",
                  });

                  showToast("Token reserved");
                }}
                className="mt-4 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90 disabled:cursor-not-allowed disabled:bg-[#374151] disabled:text-[#9CA3AF]"
              >
                Reserve Token - No Payment Needed
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderVoucherStatus = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const v = bookingState.voucher;
    const isPaid = v.paymentStatus === "paid";
    const amount =
      v.tokenType === "express" ? 1200 : v.tokenType === "normal" ? 800 : 1500;
    return (
      <div>
        <div
          className={`rounded-xl border ${isPaid ? "border-[#10B981]/40" : "border-[#374151]"} bg-[#111827] p-4`}
        >
          <div className="flex items-center justify-between">
            <p className="text-xs text-[#9CA3AF]">Voucher ID</p>
            <button
              type="button"
              onClick={() => navigator.clipboard?.writeText(v.voucherId)}
              className="flex items-center gap-1 text-xs text-[#10B981] hover:underline"
            >
              <Copy className="h-3 w-3" />
              Copy
            </button>
          </div>
          <p className="mt-1 font-mono text-lg font-bold text-white">
            {v.voucherId}
          </p>
          <div className="mt-3 flex items-center gap-2">
            {isPaid ? (
              <>
                <span className="pulse-dot h-2.5 w-2.5 rounded-full bg-[#10B981]" />
                <span className="text-sm font-medium text-[#10B981]">
                  Paid — Verified
                </span>
              </>
            ) : (
              <>
                <span className="h-2.5 w-2.5 rounded-full bg-[#9CA3AF]" />
                <span className="text-sm font-medium text-[#9CA3AF]">
                  Unpaid — Awaiting bank deposit
                </span>
              </>
            )}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-[#9CA3AF]">Amount</p>
              <p className="font-semibold text-white">Rs. {amount}</p>
            </div>
            <div>
              <p className="text-[#9CA3AF]">Bank</p>
              <p className="font-semibold text-white">
                HBL / JazzCash / EasyPaisa
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-[#9CA3AF]">Account</p>
              <p className="font-semibold text-white">1234-XXXX-XXXX</p>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <button
            type="button"
            onClick={() => {
              const updated = { ...v, paymentStatus: "paid" };
              setBookingState({
                ...bookingState,
                voucher: updated,
                step: "live-token",
              });
              const nextBookings = myBookings.map((item) =>
                item.voucherId === updated.voucherId
                  ? { ...item, paymentStatus: "paid" }
                  : item,
              );
              setMyBookings(nextBookings);
              showToast("Payment verified");
            }}
            className="w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
          >
            View My Live Token
          </button>
        </div>
      </div>
    );
  };

  const renderLiveToken = () => {
    const clinic = getClinicById(bookingState?.clinicId);
    if (!clinic) return null;
    const v = bookingState.voucher;
    const deptDoctors: Doctor[] =
      DOCTORS_BY_DEPT[bookingState.deptId as keyof typeof DOCTORS_BY_DEPT] ||
      [];
    const doc = deptDoctors.find((d: Doctor) => d.id === bookingState.doctorId);
    const position = Math.max(0, v.yourTokenNum - v.currentTokenNum);
    const eta = position * 7;
    const progress = Math.min(
      100,
      Math.max(0, ((v.currentTokenNum - 10) / (v.yourTokenNum - 10)) * 100),
    );
    const done = v.currentTokenNum >= v.yourTokenNum;
    const prefix = v.yourToken.split("-")[0];
    return (
      <div>
        <div className="rounded-xl border border-[#10B981]/30 bg-[#10B981]/5 p-4 text-center">
          <p className="text-4xl font-bold text-white">{v.yourToken}</p>
          <p className="mt-1 flex items-center justify-center gap-1.5 text-xs text-[#9CA3AF]">
            <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#10B981]" />
            Confirmed • {doc?.name} • Today
          </p>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-3">
            <p className="text-xs text-[#9CA3AF]">Now Serving</p>
            <p className="mt-1 text-lg font-bold text-white">
              {prefix}-{v.currentTokenNum}
            </p>
          </div>
          <div className="rounded-xl border border-[#374151] bg-[#111827] p-3">
            <p className="text-xs text-[#9CA3AF]">Your Turn In</p>
            <p className="mt-1 text-lg font-bold text-white">
              {done ? "It's now!" : `~${eta} min`}
            </p>
            <p className="mt-0.5 text-[11px] text-[#9CA3AF]">
              {position} people ahead
            </p>
          </div>
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-[#9CA3AF]">
            <span>Queue Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[#374151]">
            <div
              className="h-full rounded-full bg-[#10B981] transition-all duration-700"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-[#374151] bg-[#111827] p-3 text-xs text-[#9CA3AF]">
          <MessageCircle className="h-4 w-4 shrink-0 text-[#10B981]" />
          <span>
            WhatsApp: {v.phone || "03XXXXXXXXX"} — You'll get an alert when
            token {Math.max(v.currentTokenNum, v.yourTokenNum - 2)} is called
          </span>
        </div>
        <button
          type="button"
          onClick={closeBooking}
          className="mt-6 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
        >
          Done
        </button>
      </div>
    );
  };

  const renderGenericStep = () => {
    const org = bookingState.org;
    switch (bookingState.step) {
      case "g-date":
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return (
          <div>
            <h3 className="text-lg font-bold text-white">Select Date</h3>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              {org.name} is currently closed. Choose when you'd like to book.
            </p>
            <button
              type="button"
              onClick={() =>
                setBookingState({
                  ...bookingState,
                  date: tomorrow,
                  step: "g-category",
                })
              }
              className="mt-6 flex w-full items-center justify-between rounded-xl border border-[#10B981]/40 bg-[#10B981]/10 px-4 py-4 text-left transition hover:border-[#10B981]"
            >
              <span>
                <span className="block text-sm font-semibold text-white">
                  📅 Tomorrow
                </span>
                <span className="block text-xs text-[#9CA3AF]">
                  {formatDateLabel(tomorrow)} — most common
                </span>
              </span>
              <ChevronRight className="h-4 w-4 text-[#10B981]" />
            </button>
            <div className="mt-4 rounded-xl border border-[#374151] bg-[#111827] p-4">
              <label className="block text-sm font-medium text-white">
                Pick a date
              </label>
              <input
                type="date"
                min={tomorrow.toISOString().split("T")[0]}
                onChange={(e) =>
                  setBookingState({
                    ...bookingState,
                    date: new Date(`${e.target.value}T00:00:00`),
                    step: "g-category",
                  })
                }
                className="mt-2 w-full rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-2.5 text-sm text-white focus:border-[#10B981] focus:outline-none"
              />
            </div>
          </div>
        );
      case "g-category":
        return (
          <div>
            <h3 className="text-lg font-bold text-white">{org.name}</h3>
            <p className="mt-1 text-sm text-[#9CA3AF]">
              {org.status !== "closed"
                ? `⭐ ${org.rating} rating`
                : formatDateLabel(bookingState.date)}
            </p>
            <p className="mt-5 text-sm font-medium text-white">
              Select a service
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              {(
                (CATEGORY_MAP[org.type as keyof typeof CATEGORY_MAP] ||
                  []) as Array<{ icon: string; label: string }>
              ).map((c) => (
                <button
                  key={c.label}
                  type="button"
                  onClick={() =>
                    setBookingState({
                      ...bookingState,
                      category: c.label,
                      step: "g-phone",
                    })
                  }
                  className="cat-btn flex flex-col items-center gap-2 rounded-xl px-3 py-4 text-center"
                >
                  <span className="text-2xl">{c.icon}</span>
                  <span className="text-xs font-medium text-white">
                    {c.label}
                  </span>
                </button>
              ))}
            </div>
          </div>
        );
      case "g-phone":
        return (
          <div>
            <p className="text-sm text-[#9CA3AF]">
              {org.name} — {bookingState.category}
            </p>
            <div className="mt-4">
              <label className="block text-sm font-medium text-white">
                WhatsApp Number *
              </label>
              <div className="mt-1.5 flex gap-2">
                <select
                  value={bookingPhoneCode}
                  onChange={(e) => setBookingPhoneCode(e.target.value)}
                  className="rounded-lg border border-[#374151] bg-[#111827] px-2 py-2.5 text-sm text-white"
                >
                  <option value="+92">🇵🇰 +92</option>
                  <option value="+971">🇦🇪 +971</option>
                  <option value="+44">🇬🇧 +44</option>
                  <option value="+1">🇺🇸 +1</option>
                </select>
                <input
                  value={bookingPhone}
                  onChange={(e) => {
                    setBookingPhone(e.target.value);
                    setBookingPhoneValid(
                      isValidPhone(bookingPhoneCode, e.target.value),
                    );
                  }}
                  className="flex-1 rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                  placeholder="03XXXXXXXXX"
                />
              </div>
            </div>
            <button
              type="button"
              disabled={!bookingPhoneValid}
              onClick={() =>
                setBookingState({
                  ...bookingState,
                  phone: `${bookingPhoneCode} ${bookingPhone}`,
                  step: "g-payment-choice",
                })
              }
              className="mt-5 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90 disabled:cursor-not-allowed disabled:bg-[#374151] disabled:text-[#9CA3AF]"
            >
              Continue
            </button>
          </div>
        );
      case "g-payment-choice":
        return (
          <div>
            <p className="text-sm text-[#9CA3AF]">
              {org.name} — {bookingState.category}
            </p>
            <div className="mt-4 space-y-3">
              <button
                type="button"
                onClick={() =>
                  setBookingState({ ...bookingState, step: "g-payment-verify" })
                }
                className="token-card w-full rounded-xl p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">Pay Online Now</p>
                  <p className="text-sm font-bold text-[#10B981]">Rs. 1500</p>
                </div>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  JazzCash / EasyPaisa / Bank Transfer
                </p>
              </button>
              <button
                type="button"
                onClick={() => {
                  const record = {
                    voucherId: generateVoucherId(
                      org.name
                        .replace(/[^A-Za-z]/g, "")
                        .toUpperCase()
                        .slice(0, 4) || "ORG",
                    ),
                    token: generateGenericToken(
                      org.type,
                      org.status === "closed",
                    ),
                    orgName: org.name,
                    category: bookingState.category,
                    date: formatDateLabel(bookingState.date || new Date()),
                    phone: bookingState.phone,
                    paymentStatus: "Pending",
                    txnId: null,
                    method: null,
                    wait: org.wait,
                  };
                  const nextBookings = [
                    ...myBookings,
                    {
                      ...record,
                      phone: bookingState.phone,
                      date: formatDateLabel(bookingState.date || new Date()),
                    },
                  ];
                  setMyBookings(nextBookings);
                  setBookingState({
                    ...bookingState,
                    genericRecord: record,
                    step: "g-confirm",
                  });
                  showToast("Booking confirmed");
                }}
                className="token-card w-full rounded-xl p-4 text-left"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-white">
                    Pay at Receptionist
                  </p>
                  <p className="text-sm font-bold text-[#10B981]">Rs. 1500</p>
                </div>
                <p className="mt-1 text-xs text-[#9CA3AF]">
                  No online payment needed
                </p>
              </button>
            </div>
          </div>
        );
      case "g-payment-verify":
        return (
          <div>
            <p className="text-sm font-semibold text-white">
              Complete Payment - Rs. 1500
            </p>
            <div className="mt-4 space-y-3">
              {["JazzCash", "EasyPaisa", "Bank Transfer"].map((pm) => (
                <button
                  key={pm}
                  type="button"
                  onClick={() => setPaymentMethod(pm)}
                  className={`token-card w-full rounded-xl p-4 text-left ${paymentMethod === pm ? "border-[#10B981] bg-[#10B981]/10" : ""}`}
                >
                  <p className="font-semibold text-white">{pm}</p>
                </button>
              ))}
            </div>
            <div className="mt-4">
              <label className="block text-sm font-medium text-white">
                Transaction ID
              </label>
              <input
                value={txnId}
                onChange={(e) => setTxnId(e.target.value)}
                placeholder="Enter Transaction ID / TID"
                className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
              />
            </div>
            <button
              type="button"
              disabled={txnId.trim().length < 6}
              onClick={() => {
                const record = {
                  voucherId: generateVoucherId(
                    org.name
                      .replace(/[^A-Za-z]/g, "")
                      .toUpperCase()
                      .slice(0, 4) || "ORG",
                  ),
                  token: generateGenericToken(
                    org.type,
                    org.status === "closed",
                  ),
                  orgName: org.name,
                  category: bookingState.category,
                  date: formatDateLabel(bookingState.date || new Date()),
                  phone: bookingState.phone,
                  paymentStatus: "Paid",
                  txnId,
                  method: paymentMethod,
                  wait: org.wait,
                };
                const nextBookings = [
                  ...myBookings,
                  {
                    ...record,
                    phone: bookingState.phone,
                    date: formatDateLabel(bookingState.date || new Date()),
                  },
                ];
                setMyBookings(nextBookings);
                setBookingState({
                  ...bookingState,
                  genericRecord: record,
                  step: "g-confirm",
                });
                showToast("Payment verified");
              }}
              className="mt-4 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90 disabled:cursor-not-allowed disabled:bg-[#374151] disabled:text-[#9CA3AF]"
            >
              Verify & Get Token
            </button>
          </div>
        );
      case "g-confirm":
        const record = bookingState.genericRecord;
        return (
          <div className="flex flex-col items-center py-8 text-center">
            <div className="text-5xl">✅</div>
            <p className="mt-4 text-lg font-bold text-white">
              Booking Confirmed
            </p>
            <p className="mt-2 font-mono text-3xl font-bold text-white">
              {record.token}
            </p>
            <p className="mt-3 text-sm text-[#9CA3AF]">{record.orgName}</p>
            <p className="text-sm text-[#9CA3AF]">{record.category}</p>
            <p className="text-sm text-[#9CA3AF]">{record.date}</p>
            <p className="mt-2 font-mono text-xs text-[#9CA3AF]">
              {record.voucherId}
            </p>
            <button
              type="button"
              onClick={closeBooking}
              className="mt-6 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
            >
              Done
            </button>
          </div>
        );
      default:
        return null;
    }
  };

  const bookingHeader = (
    title: string,
    showBack = true,
    onBack?: () => void,
  ) => (
    <div className="flex shrink-0 items-center justify-between border-b border-[#374151] p-5">
      <button
        type="button"
        onClick={
          onBack ||
          (() => setBookingState({ ...bookingState, step: "clinic-detail" }))
        }
        className={`items-center gap-1 text-xs text-[#9CA3AF] transition hover:text-white ${showBack ? "flex" : "hidden"}`}
      >
        <ChevronLeft className="h-3.5 w-3.5" />
        Back
      </button>
      <p className="text-sm font-medium text-[#9CA3AF]">{title}</p>
      <button
        type="button"
        aria-label="Close booking"
        onClick={closeBooking}
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#374151] text-[#9CA3AF] transition hover:border-[#10B981]/50 hover:text-white"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );

  const renderBookingBody = () => {
    if (!bookingState) return null;
    const titleMap: Record<string, string> = {
      "clinic-detail": "Clinic",
      "doctor-list": "Doctors",
      "future-date": "Future Appointment",
      "token-type": "Select Token",
      "emergency-form": "Emergency Verification",
      "contact-voucher": "Payment",
      "voucher-status": "Voucher",
      "live-token": "Live Token",
      "g-date": "Select Date",
      "g-category": bookingState.org?.name || "Booking",
      "g-phone": "Contact Details",
      "g-payment-choice": "Choose Payment",
      "g-payment-verify": "Complete Payment",
      "g-confirm": "Confirmed",
    };
    const handleBookingBack = () => {
      if (bookingState.flow === "clinic") {
        if (bookingState.step === "clinic-detail") {
          closeAllOverlays();
          setShowSearchOverlay(true);
          setBookingState(null);
          return;
        }
        if (bookingState.step === "doctor-list")
          setBookingState({ ...bookingState, step: "clinic-detail" });
        else if (bookingState.step === "future-date")
          setBookingState({ ...bookingState, step: "doctor-list" });
        else if (bookingState.step === "token-type")
          setBookingState({ ...bookingState, step: "doctor-list" });
        else if (bookingState.step === "emergency-form")
          setBookingState({ ...bookingState, step: "token-type" });
        else if (bookingState.step === "contact-voucher")
          setBookingState({ ...bookingState, step: "token-type" });
        else if (bookingState.step === "voucher-status")
          setBookingState({ ...bookingState, step: "contact-voucher" });
        else if (bookingState.step === "live-token") closeBooking();
      } else {
        if (bookingState.step === "g-phone")
          setBookingState({ ...bookingState, step: "g-category" });
        else if (bookingState.step === "g-payment-choice")
          setBookingState({ ...bookingState, step: "g-phone" });
        else if (bookingState.step === "g-payment-verify")
          setBookingState({ ...bookingState, step: "g-payment-choice" });
      }
    };

    return (
      <div className="flex h-full flex-col">
        {bookingHeader(
          titleMap[bookingState.step] || "Booking",
          Boolean(
            bookingState.step !== "clinic-detail" &&
            bookingState.flow === "clinic",
          ),
          handleBookingBack,
        )}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {bookingState.flow === "clinic" ? (
            <>
              {bookingState.step === "clinic-detail" && renderClinicDetail()}
              {bookingState.step === "doctor-list" && renderDoctorList()}
              {bookingState.step === "future-date" && renderFutureAppointment()}
              {bookingState.step === "token-type" && renderTokenType()}
              {bookingState.step === "emergency-form" && renderEmergencyForm()}
              {bookingState.step === "contact-voucher" &&
                renderContactVoucher()}
              {bookingState.step === "voucher-status" && renderVoucherStatus()}
              {bookingState.step === "live-token" && renderLiveToken()}
            </>
          ) : (
            renderGenericStep()
          )}
        </div>
      </div>
    );
  };

  const renderBusinessDashboard = () => {
    if (!currentBusiness) {
      return (
        <div className="mx-auto flex max-w-6xl flex-col items-center gap-10 px-4 py-10 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8 lg:py-24">
          <div className="hidden max-w-md lg:block">
            <h1 className="text-4xl font-bold leading-tight text-white">
              Manage your queues{" "}
              <span className="text-[#10B981]">like a pro.</span>
            </h1>
            <p className="mt-4 text-sm text-[#9CA3AF]">
              One dashboard for tokens, doctors, payments, and real-time queue
              analytics.
            </p>
          </div>
          <div className="w-full max-w-sm rounded-2xl border border-[#374151] bg-[#1F2937] p-8">
            <p className="text-center text-lg font-bold">
              <span className="text-white">Queue</span>
              <span className="text-[#10B981]">IQ</span>
              <span className="ml-1 text-sm font-medium text-[#9CA3AF]">
                Business
              </span>
            </p>
            <p className="mt-1 text-center text-xs text-[#9CA3AF]">
              Log in to your dashboard
            </p>
            <div className="mt-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white">
                  Email *
                </label>
                <input
                  value={businessEmail}
                  onChange={(e) => setBusinessEmail(e.target.value)}
                  type="email"
                  placeholder="you@business.com"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Password *
                </label>
                <div className="relative mt-1.5">
                  <input
                    value={businessPassword}
                    onChange={(e) => setBusinessPassword(e.target.value)}
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 pr-10 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9CA3AF] hover:text-white"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>
              {bizError ? (
                <p className="text-[11px] text-[#EF4444]">{bizError}</p>
              ) : null}
              <button
                type="button"
                onClick={businessLogin}
                className="w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
              >
                Log In
              </button>
              <div className="rounded-lg border border-[#374151] bg-[#111827] p-3 text-[11px] text-[#9CA3AF]">
                <p className="mb-1.5 font-medium text-white">
                  Demo accounts (password:{" "}
                  <span className="font-mono text-white">123456</span>)
                </p>
                <p className="font-mono">
                  admin@alshifa.com{" "}
                  <span className="text-[#9CA3AF]">— owner</span>
                </p>
                <p className="font-mono">
                  reception@alshifa.com{" "}
                  <span className="text-[#9CA3AF]">— receptionist</span>
                </p>
                <p className="font-mono">
                  dr.ayesha@alshifa.com{" "}
                  <span className="text-[#9CA3AF]">— doctor</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-8">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-white sm:text-2xl">
              Welcome back, {currentBusiness.orgName} 👋
            </h1>
            <p className="mt-1 flex items-center gap-2 text-sm text-[#9CA3AF]">
              <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[#10B981]" />
              Here's what's happening with your queues today.
            </p>
          </div>
          <button
            type="button"
            onClick={bizLogout}
            className="rounded-lg border border-[#374151] px-4 py-2 text-sm font-medium text-white transition hover:border-[#EF4444]/50 hover:text-[#EF4444]"
          >
            Log Out
          </button>
        </div>
        <div className="mt-6 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => showToast("Queue resumed")}
            className="rounded-lg border border-[#374151] px-4 py-2 text-sm font-medium text-white transition hover:border-[#10B981]/50"
          >
            Resume Queue
          </button>
          <button
            type="button"
            onClick={addWalkInToken}
            className="rounded-lg border border-[#EF4444]/30 bg-[#EF4444]/10 px-4 py-2 text-sm font-medium text-[#EF4444] transition hover:border-[#EF4444]/60"
          >
            + Add Walk-in Token
          </button>
        </div>
        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-5">
            <p className="text-xs text-[#9CA3AF]">Tokens Today</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {businessQueue.length}
            </p>
          </div>
          <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-5">
            <p className="text-xs text-[#9CA3AF]">Now Serving</p>
            <p className="mt-1 text-2xl font-bold text-[#10B981]">
              {businessQueue.find((row) => row.status === "Serving")?.token ||
                "--"}
            </p>
          </div>
          <div className="rounded-xl border border-[#374151] bg-[#1F2937] p-5">
            <p className="text-xs text-[#9CA3AF]">Waiting</p>
            <p className="mt-1 text-2xl font-bold text-white">
              {businessQueue.filter((row) => row.status === "Waiting").length}
            </p>
          </div>
        </div>
        <div className="mt-8">
          <p className="mb-3 text-sm font-semibold text-white">Live Queue</p>
          <div className="hidden overflow-x-auto rounded-xl border border-[#374151] sm:block">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-[#374151] bg-[#111827] text-[11px] uppercase tracking-wide text-[#9CA3AF]">
                  <th className="px-4 py-3">Token</th>
                  <th className="px-4 py-3">Phone</th>
                  <th className="px-4 py-3">Doctor</th>
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {businessQueue.map((row) => (
                  <tr
                    key={row.token}
                    className="border-b border-[#374151] last:border-0"
                  >
                    <td className="px-4 py-3 font-mono font-bold text-white">
                      {row.token}
                    </td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{row.phone}</td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{row.doctor}</td>
                    <td className="px-4 py-3 text-[#9CA3AF]">{row.time}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium ${row.status === "Serving" ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]" : row.status === "Done" ? "border-[#374151] bg-[#1F2937] text-[#9CA3AF]" : row.status === "Skipped" ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]" : "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"}`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1.5">
                        {row.status === "Waiting" ? (
                          <button
                            type="button"
                            onClick={() => handleQueueAction("call", row.token)}
                            className="rounded-lg border border-[#374151] px-2 py-1 text-[11px] font-medium text-white transition hover:border-[#10B981]/50"
                          >
                            Call Next
                          </button>
                        ) : null}
                        {row.status !== "Done" ? (
                          <button
                            type="button"
                            onClick={() => handleQueueAction("done", row.token)}
                            className="rounded-lg border border-[#374151] px-2 py-1 text-[11px] font-medium text-white transition hover:border-[#10B981]/50"
                          >
                            Done
                          </button>
                        ) : null}
                        {row.status === "Waiting" ? (
                          <button
                            type="button"
                            onClick={() => handleQueueAction("skip", row.token)}
                            className="rounded-lg border border-[#374151] px-2 py-1 text-[11px] font-medium text-[#EF4444] transition hover:border-[#EF4444]/50"
                          >
                            Skip
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex flex-col gap-3 sm:hidden">
            {businessQueue.map((row) => (
              <div
                key={`card-${row.token}`}
                className="rounded-xl border border-[#374151] bg-[#1F2937] p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-lg font-bold text-white">
                    {row.token}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] font-medium ${row.status === "Serving" ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]" : row.status === "Done" ? "border-[#374151] bg-[#1F2937] text-[#9CA3AF]" : row.status === "Skipped" ? "border-[#EF4444]/30 bg-[#EF4444]/10 text-[#EF4444]" : "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"}`}
                  >
                    {row.status}
                  </span>
                </div>
                <div className="mt-2 space-y-1 text-xs text-[#9CA3AF]">
                  <p>Dr: {row.doctor}</p>
                  <p>Phone: {row.phone}</p>
                  <p>Time: {row.time}</p>
                </div>
                <div className="mt-3 flex gap-2">
                  {row.status === "Waiting" ? (
                    <button
                      type="button"
                      onClick={() => handleQueueAction("call", row.token)}
                      className="flex-1 rounded-lg border border-[#374151] py-2 text-xs font-medium text-white transition hover:border-[#10B981]/50"
                    >
                      Call Next
                    </button>
                  ) : null}
                  {row.status !== "Done" ? (
                    <button
                      type="button"
                      onClick={() => handleQueueAction("done", row.token)}
                      className="flex-1 rounded-lg border border-[#374151] py-2 text-xs font-medium text-white transition hover:border-[#10B981]/50"
                    >
                      Done
                    </button>
                  ) : null}
                  {row.status === "Waiting" ? (
                    <button
                      type="button"
                      onClick={() => handleQueueAction("skip", row.token)}
                      className="flex-1 rounded-lg border border-[#374151] py-2 text-xs font-medium text-[#EF4444] transition hover:border-[#EF4444]/50"
                    >
                      Skip
                    </button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const renderMyBookingsModal = () => (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-[#111827]/75 p-4 ${showMyBookings ? "" : "hidden"}`}
      role="dialog"
      aria-modal="true"
      aria-label="My bookings"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#374151] bg-[#1F2937]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#374151] px-5 py-4">
          <h3 className="font-semibold text-white">My Bookings</h3>
          <button
            type="button"
            onClick={closeMyBookings}
            className="rounded-lg p-1 text-[#9CA3AF] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          {myBookings.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <div className="mb-3 text-4xl">🗂️</div>
              <p className="text-sm font-medium text-white">No bookings yet</p>
              <p className="mt-1 text-xs text-[#9CA3AF]">
                Book a token or appointment and it&apos;ll show up here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {myBookings.map((booking, idx) => (
                <div
                  key={`${booking.voucherId}-${idx}`}
                  className="result-card flex flex-col rounded-xl p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {booking.orgName}
                      </p>
                      <p className="mt-0.5 text-xs text-[#9CA3AF]">
                        {booking.category || ""}
                      </p>
                    </div>
                    <p className="shrink-0 font-mono text-xl font-bold text-[#10B981]">
                      {booking.token || booking.yourToken}
                    </p>
                  </div>
                  <div className="mt-3 space-y-1.5 text-xs text-[#9CA3AF]">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      {booking.date}
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {booking.phone}
                    </div>
                    <div className="flex items-center gap-1.5 font-mono">
                      <Ticket className="h-3.5 w-3.5" />
                      {booking.voucherId}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${booking.paymentStatus === "paid" || booking.paymentStatus === "Paid" ? "border-[#10B981]/30 bg-[#10B981]/10 text-[#10B981]" : "border-[#F59E0B]/30 bg-[#F59E0B]/10 text-[#F59E0B]"}`}
                    >
                      {booking.paymentStatus === "paid" ||
                      booking.paymentStatus === "Paid"
                        ? "Paid"
                        : "Pending"}
                    </span>
                    <span className="inline-flex items-center gap-1 rounded-full border border-[#10B981]/30 bg-[#10B981]/10 px-2 py-0.5 text-[10px] font-medium text-[#10B981]">
                      <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                      Live
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderContactModal = () => (
    <div
      className={`fixed inset-0 z-[90] flex items-center justify-center bg-[#111827]/75 p-4 ${showContactModal ? "" : "hidden"}`}
      role="dialog"
      aria-modal="true"
      aria-label="Contact us"
    >
      <div className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#374151] bg-[#1F2937]/90 backdrop-blur-xl">
        <div className="flex items-center justify-between border-b border-[#374151] px-5 py-4">
          <h3 className="font-semibold text-white">Get in Touch</h3>
          <button
            type="button"
            onClick={() => setShowContactModal(false)}
            className="rounded-lg p-1 text-[#9CA3AF] hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="overflow-y-auto p-5">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setContactTab("patient")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${contactTab === "patient" ? "bg-[#10B981] text-[#111827]" : "border border-[#374151] text-[#9CA3AF]"}`}
            >
              I am a Patient
            </button>
            <button
              type="button"
              onClick={() => setContactTab("business")}
              className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium transition ${contactTab === "business" ? "bg-[#10B981] text-[#111827]" : "border border-[#374151] text-[#9CA3AF]"}`}
            >
              I am a Business
            </button>
          </div>
          {contactTab === "patient" ? (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white">
                  Name *
                </label>
                <input
                  value={contactForm.name}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, name: e.target.value })
                  }
                  type="text"
                  placeholder="Your full name"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Phone *
                </label>
                <input
                  value={contactForm.phone}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, phone: e.target.value })
                  }
                  type="tel"
                  placeholder="03XXXXXXXXX"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Issue Type *
                </label>
                <select
                  value={contactForm.issue}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, issue: e.target.value })
                  }
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white focus:border-[#10B981] focus:outline-none"
                >
                  <option value="">Select issue...</option>
                  <option value="Token Issue">Token Issue</option>
                  <option value="Payment Issue">Payment Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Message *
                </label>
                <textarea
                  value={contactForm.message}
                  onChange={(e) =>
                    setContactForm({ ...contactForm, message: e.target.value })
                  }
                  rows={3}
                  placeholder="Tell us what's going on..."
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  showToast("Thanks! Support will contact you within 24h");
                  setShowContactModal(false);
                }}
                className="w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
              >
                Submit
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-white">
                  Full Name *
                </label>
                <input
                  value={businessContactForm.name}
                  onChange={(e) =>
                    setBusinessContactForm({
                      ...businessContactForm,
                      name: e.target.value,
                    })
                  }
                  type="text"
                  placeholder="Your full name"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Business Name *
                </label>
                <input
                  value={businessContactForm.businessName}
                  onChange={(e) =>
                    setBusinessContactForm({
                      ...businessContactForm,
                      businessName: e.target.value,
                    })
                  }
                  type="text"
                  placeholder="e.g. Al-Shifa Clinic"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Business Type *
                </label>
                <select
                  value={businessContactForm.businessType}
                  onChange={(e) =>
                    setBusinessContactForm({
                      ...businessContactForm,
                      businessType: e.target.value,
                    })
                  }
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white focus:border-[#10B981] focus:outline-none"
                >
                  <option value="">Select type...</option>
                  <option>Clinic</option>
                  <option>Hospital</option>
                  <option>Lab</option>
                  <option>Bank</option>
                  <option>Salon</option>
                  <option>Govt Office</option>
                  <option>Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Phone *
                </label>
                <input
                  value={businessContactForm.phone}
                  onChange={(e) =>
                    setBusinessContactForm({
                      ...businessContactForm,
                      phone: e.target.value,
                    })
                  }
                  type="tel"
                  placeholder="03XXXXXXXXX"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  Email *
                </label>
                <input
                  value={businessContactForm.email}
                  onChange={(e) =>
                    setBusinessContactForm({
                      ...businessContactForm,
                      email: e.target.value,
                    })
                  }
                  type="email"
                  placeholder="you@business.com"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white">
                  City *
                </label>
                <input
                  value={businessContactForm.city}
                  onChange={(e) =>
                    setBusinessContactForm({
                      ...businessContactForm,
                      city: e.target.value,
                    })
                  }
                  type="text"
                  placeholder="e.g. Lahore"
                  className="mt-1.5 w-full rounded-lg border border-[#374151] bg-[#111827] px-3 py-2.5 text-sm text-white placeholder-[#9CA3AF] focus:border-[#10B981] focus:outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  showToast(
                    "Request received! Our team will call you within 24h to setup your dashboard.",
                  );
                  setShowContactModal(false);
                }}
                className="w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
              >
                Submit
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#111827] text-white">
      <div
        className={`fixed inset-0 z-[200] flex items-center justify-center bg-[#111827] transition-transform duration-700 ease-[cubic-bezier(0.7,0,0.3,1)] ${showSwitchOverlay ? "translate-y-0" : "translate-y-full"}`}
      >
        <div className="absolute inset-0 bg-linear-to-br from-[#10B981]/20 via-[#111827] to-[#10B981]/10" />
        <div className="relative flex flex-col items-center">
          <p className="animate-pulse text-3xl font-bold">
            <span className="text-white">Queue</span>
            <span className="text-[#10B981]">IQ</span>
          </p>
          <p className="mt-2 text-xs tracking-widest text-[#9CA3AF]">
            SWITCHING TO BUSINESS
          </p>
        </div>
      </div>

      {view === "user" ? (
        <div
          className={`min-h-screen bg-[#111827] text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSwitching && switchTarget === "business" ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
        >
          <header className="sticky top-0 z-40 border-b border-[#374151] bg-[#111827]/70 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
              <a href="#top" className="text-2xl font-bold tracking-tight">
                <span className="text-white">Queue</span>
                <span className="text-[#10B981]">IQ</span>
              </a>
              <div className="hidden items-center gap-6 md:flex">
                <a
                  href="#how-it-works"
                  className="text-sm text-[#9CA3AF] transition hover:text-white"
                >
                  How it works
                </a>
                <a
                  href="#about"
                  className="text-sm text-[#9CA3AF] transition hover:text-white"
                >
                  About Us
                </a>
                <button
                  type="button"
                  onClick={() => {
                    setShowContactModal(true);
                    setContactTab("patient");
                  }}
                  className="text-sm text-[#9CA3AF] transition hover:text-white"
                >
                  Contact Us
                </button>
                <button
                  type="button"
                  onClick={openMyBookings}
                  className="text-sm text-[#9CA3AF] transition hover:text-white"
                >
                  My Bookings
                </button>
                <button
                  type="button"
                  onClick={switchToBusiness}
                  className="rounded-full border border-[#374151] bg-[#1F2937] px-4 py-2 text-sm font-medium text-white transition hover:border-[#10B981]/50 hover:text-[#10B981]"
                >
                  Switch to Business
                </button>
              </div>
              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle menu"
                aria-expanded={mobileMenuOpen}
                className="inline-flex items-center justify-center rounded-lg border border-[#374151] p-2 text-white transition hover:border-[#10B981]/50 md:hidden"
              >
                {mobileMenuOpen ? (
                  <X className="h-5 w-5" />
                ) : (
                  <Menu className="h-5 w-5" />
                )}
              </button>
            </nav>
            {mobileMenuOpen ? (
              <div className="border-t border-[#374151] bg-[#111827]/95 backdrop-blur-md md:hidden">
                <div className="flex flex-col gap-1 px-6 py-4">
                  <a
                    href="#how-it-works"
                    className="rounded-lg px-3 py-3 text-sm text-[#9CA3AF] transition hover:bg-[#1F2937] hover:text-white"
                  >
                    How it works
                  </a>
                  <a
                    href="#about"
                    className="rounded-lg px-3 py-3 text-sm text-[#9CA3AF] transition hover:bg-[#1F2937] hover:text-white"
                  >
                    About Us
                  </a>
                  <button
                    type="button"
                    onClick={() => {
                      setShowContactModal(true);
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg px-3 py-3 text-left text-sm text-[#9CA3AF] transition hover:bg-[#1F2937] hover:text-white"
                  >
                    Contact Us
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      openMyBookings();
                      setMobileMenuOpen(false);
                    }}
                    className="rounded-lg px-3 py-3 text-left text-sm text-[#9CA3AF] transition hover:bg-[#1F2937] hover:text-white"
                  >
                    My Bookings
                  </button>
                  <div className="mt-2 border-t border-[#374151] pt-3">
                    <button
                      type="button"
                      onClick={() => {
                        switchToBusiness();
                        setMobileMenuOpen(false);
                      }}
                      className="block rounded-lg border border-[#374151] bg-[#1F2937] px-3 py-3 text-center text-sm font-medium text-white transition hover:border-[#10B981]/50 hover:text-[#10B981]"
                    >
                      Switch to Business
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
          </header>

          <div id="top">
            <main>
              <section className="relative overflow-hidden px-4 pt-16 pb-16 sm:px-6 sm:pt-20 lg:px-8 lg:pt-28 lg:pb-32">
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute left-1/2 top-0 h-64 w-full -translate-x-1/2 rounded-full bg-[#10B981]/10 blur-[120px] sm:h-96 sm:w-[45rem]"
                />
                <div className="relative mx-auto max-w-3xl text-center">
                  <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#374151] bg-[#1F2937] px-4 py-1.5 text-xs font-medium text-[#9CA3AF]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#10B981]" />
                    Live queues across 4,000+ organizations
                  </div>
                  <h1 className="text-2xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                     Book your slot only to be there 
                    {/* <br className="hidden sm:block" /> */}
                  </h1>

                  <h1 className="text-[#10B981] text-2xl font-bold leading-tight tracking-tight sm:text-4xl lg:text-5xl">
                      When it's your turn!
                  </h1>
                  <p className="mx-auto mt-6 max-w-lg text-base text-[#9CA3AF] sm:text-lg">
                    AI-powered real-time queue management.
                  </p>
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      openSearch(searchQuery);
                    }}
                    className="mx-auto mt-10 max-w-2xl"
                  >
                    <div className="flex items-center gap-2 rounded-xl border border-[#374151] bg-[#1F2937] px-3 py-3 transition focus-within:border-[#10B981]/60 sm:px-5 sm:py-4">
                      <Search className="h-5 w-5 shrink-0 text-[#9CA3AF]" />
                      <input
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        type="text"
                        placeholder="Search for a clinic, bank, or salon..."
                        className="w-full bg-transparent text-sm text-white placeholder:text-[#9CA3AF] focus:outline-none"
                      />
                      <button
                        type="submit"
                        aria-label="Search"
                        className="flex shrink-0 items-center justify-center rounded-lg bg-[#10B981] p-2 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90 sm:px-5 sm:py-2.5"
                      >
                        <Search className="h-5 w-5 sm:hidden" />
                        <span className="hidden sm:inline">Search</span>
                      </button>
                    </div>
                  </form>
                  <div className="mt-10 max-w-3xl mx-auto overflow-hidden marquee-fade">
                    <div className="flex gap-8 w-max marquee-track">
                      {[
                        "Al-Shifa Clinic — next token in 12 min",
                        "NADRA Gulberg — next token in 6 min",
                        "Style Loft Salon — next token in 3 min",
                        "City Diagnostics Lab — next token in 20 min",
                      ].map((item) => (
                        <span
                          key={item}
                          className="text-sm text-[#9CA3AF] whitespace-nowrap"
                        >
                          🟢 {item}
                        </span>
                      ))}
                      {[
                        "Al-Shifa Clinic — next token in 12 min",
                        "NADRA Gulberg — next token in 6 min",
                        "Style Loft Salon — next token in 3 min",
                        "City Diagnostics Lab — next token in 20 min",
                      ].map((item) => (
                        <span
                          key={`${item}-dup`}
                          className="text-sm text-[#9CA3AF] whitespace-nowrap"
                        >
                          🟢 {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </section>

              <section id="categories" className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-7xl">
                  <div className="mb-12 text-center">
                    <h2 className="text-2xl font-bold sm:text-3xl">
                      What are you waiting for?
                    </h2>
                    <p className="mt-3 text-sm text-[#9CA3AF] sm:text-base">
                      Every service, one queue system.
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                    {[
                      {
                        label: "Health",
                        subtitle: "Clinics & hospitals",
                        icon: HeartPulse,
                      },
                      {
                        label: "Government",
                        subtitle: "NADRA, banks, offices",
                        icon: Landmark,
                      },
                      {
                        label: "Beauty",
                        subtitle: "Salons & spas",
                        icon: Scissors,
                      },
                      {
                        label: "Dining",
                        subtitle: "Restaurants & cafés",
                        icon: UtensilsCrossed,
                      },
                      {
                        label: "Retail",
                        subtitle: "Stores & showrooms",
                        icon: ShoppingBag,
                      },
                      {
                        label: "Others",
                        subtitle: "Everything else",
                        icon: MoreHorizontal,
                      },
                    ].map((card) => {
                      const Icon = card.icon;
                      return (
                        <button
                          key={card.label}
                          type="button"
                          onClick={() =>
                            openSearch(
                              card.label === "Others" ? "" : card.label,
                            )
                          }
                          className="group flex flex-col items-center gap-3 rounded-2xl border border-[#374151] bg-[#1F2937] px-4 py-8 text-center transition-all duration-300 hover:-translate-y-2 hover:border-[#10B981]/60 hover:bg-[#1a2e25] hover:shadow-[0_8px_30px_-8px_rgba(16,185,129,0.45)]"
                        >
                          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#10B981]/10 text-[#10B981] transition-all duration-300 group-hover:scale-110 group-hover:bg-[#10B981]/25 group-hover:rotate-[-6deg]">
                            <Icon className="h-5 w-5 transition-transform duration-300 group-hover:scale-110" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-white transition-colors duration-200 group-hover:text-[#10B981]">
                              {card.label}
                            </p>
                            <p className="mt-1 text-xs text-[#9CA3AF]">
                              {card.subtitle}
                            </p>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </section>

              <section id="how-it-works" className="px-6 py-20 lg:px-8">
                <div className="mx-auto max-w-6xl">
                  <div className="mb-14 text-center">
                    <h2 className="text-2xl font-bold sm:text-3xl">
                      How it works
                    </h2>
                    <p className="mt-3 text-sm text-[#9CA3AF] sm:text-base">
                      Three steps between you and a shorter wait.
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
                    {[
                      {
                        title: "Search for a location",
                        text: "Find any clinic, bank, salon, or service near you — sorted by rating.",
                        icon: MapPin,
                      },
                      {
                        title: "Join the live queue",
                        text: "Book a token in seconds over WhatsApp or the app. No calls, no forms.",
                        icon: Smartphone,
                      },
                      {
                        title: "Arrive on your turn",
                        text: "Wait wherever you like. We notify you exactly when it is time to walk in.",
                        icon: Clock3,
                      },
                    ].map((step, idx) => {
                      const Icon = step.icon;
                      return (
                        <div
                          key={step.title}
                          className="relative flex flex-col items-center text-center"
                        >
                          <div
                            aria-hidden="true"
                            className="absolute left-1/2 top-8 hidden h-px w-full bg-linear-to-r from-[#374151] via-[#374151] to-transparent md:block"
                          />{" "}
                          <div className="relative z-10 flex h-16 w-16 items-center justify-center rounded-2xl border border-[#10B981]/30 bg-[#1F2937] text-[#10B981]">
                            <Icon className="h-6 w-6" />
                          </div>
                          <h3 className="mt-6 text-lg font-semibold text-white">
                            {step.title}
                          </h3>
                          <p className="mt-2 max-w-xs text-sm text-[#9CA3AF]">
                            {step.text}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </section>
            </main>

            <section
              id="about"
              className="border-t border-[#374151] bg-[#111827] px-6 py-20 lg:px-8"
            >
              <div className="mx-auto max-w-5xl text-center">
                <div className="inline-flex items-center gap-2 rounded-full border border-[#374151] bg-[#1F2937] px-4 py-1.5 text-xs font-medium text-[#9CA3AF]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#10B981]" />
                  About QueueIQ
                </div>
                <h2 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl">
                  We hate waiting. So we fixed it.
                </h2>
                <p className="mx-auto mt-4 max-w-2xl text-sm text-[#9CA3AF] sm:text-base">
                  QueueIQ was born in Karachi out of a simple frustration: hours
                  lost standing in clinic corridors, bank lines, and government
                  offices with no idea how long the wait would really be.
                </p>
                <div className="mt-10 grid grid-cols-2 gap-4 md:grid-cols-4">
                  {["4,000+", "2.3M+", "18 min", "24/7"].map((value, idx) => (
                    <div
                      key={value}
                      className="rounded-xl border border-[#374151] bg-[#1F2937] p-5"
                    >
                      <p className="text-2xl font-bold text-[#10B981]">
                        {value}
                      </p>
                      <p className="mt-1 text-xs text-[#9CA3AF]">
                        {["Orgs", "Tokens", "Avg saved", "Live"][idx]}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </section>
            <footer className="border-t border-[#374151] px-6 pb-24 pt-12 lg:px-8">
              <div className="mx-auto max-w-7xl">
                <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <p className="text-xl font-bold">
                      <span className="text-white">Queue</span>
                      <span className="text-[#10B981]">IQ</span>
                    </p>
                    <p className="mt-2 max-w-xs text-xs text-[#9CA3AF]">
                      AI-powered real-time queue management for clinics, banks,
                      salons, and more.
                    </p>
                  </div>
                  <div className="flex gap-12 text-sm">
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
                        Product
                      </p>
                      <a
                        href="#how-it-works"
                        className="text-[#9CA3AF] transition hover:text-white"
                      >
                        How it works
                      </a>
                      <button
                        type="button"
                        onClick={() => openSearch("")}
                        className="text-left text-[#9CA3AF] transition hover:text-white"
                      >
                        Find a queue
                      </button>
                    </div>
                    <div className="flex flex-col gap-3">
                      <p className="text-xs font-semibold uppercase tracking-widest text-[#9CA3AF]">
                        Company
                      </p>
                      <a
                        href="#about"
                        className="text-[#9CA3AF] transition hover:text-white"
                      >
                        About Us
                      </a>
                      <button
                        type="button"
                        onClick={() => {
                          setShowContactModal(true);
                          setContactTab("patient");
                        }}
                        className="text-left text-[#9CA3AF] transition hover:text-white"
                      >
                        Contact
                      </button>
                    </div>
                  </div>
                </div>
                <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-[#374151] pt-6 sm:flex-row sm:items-center">
                  <p className="text-xs text-[#6B7280]">
                    © 2026 QueueIQ. All rights reserved.
                  </p>
                  <p className="text-xs text-[#6B7280]">
                    Book your spot only to be there, When its your turn!
                  </p>
                </div>
              </div>
            </footer>
          </div>
        </div>
      ) : (
        <div
          className={`min-h-screen bg-[#111827] text-white transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${isSwitching && switchTarget === "user" ? "translate-y-full opacity-0" : "translate-y-0 opacity-100"}`}
        >
          <header className="sticky top-0 z-40 border-b border-[#374151] bg-[#111827]/70 backdrop-blur-md">
            <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 lg:px-8">
              <p className="text-2xl font-bold tracking-tight">
                <span className="text-white">Queue</span>
                <span className="text-[#10B981]">IQ</span>
                <span className="ml-1 align-middle text-xs font-medium text-[#9CA3AF]">
                  Business
                </span>
              </p>
              <button
                type="button"
                onClick={switchToUser}
                className="flex items-center gap-1.5 rounded-full border border-[#374151] bg-[#1F2937] px-4 py-2 text-sm font-medium text-white transition hover:border-[#10B981]/50 hover:text-[#10B981]"
              >
                {" "}
                <ArrowLeft className="h-3.5 w-3.5" /> Back to QueueIQ
              </button>
            </nav>
          </header>
          {renderBusinessDashboard()}
        </div>
      )}

      {/* Portals — outside both view wrappers to avoid transform stacking context trapping fixed children */}
      <div
        className={`fade-enter fixed inset-0 z-[60] flex items-end justify-center p-0 md:items-center md:p-6 ${showSearchOverlay ? "show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Search results"
        onClick={closeSearch}
      >
        <div
          className="modal-panel panel-anim flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl md:h-auto md:max-h-[85vh] md:max-w-3xl md:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="shrink-0 border-b border-[#374151] p-5">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#9CA3AF]" />
                <input
                  id="overlaySearchInput"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  type="text"
                  placeholder="Search for a clinic, bank, or salon..."
                  className="w-full rounded-lg border border-[#374151] bg-[#111827] py-2.5 pl-10 pr-3 text-sm text-white placeholder-[#9CA3AF] transition focus:border-[#10B981] focus:outline-none focus:ring-2 focus:ring-[#10B981]/60"
                />
              </div>
              <button
                type="button"
                onClick={closeSearch}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#374151] text-[#9CA3AF] transition hover:border-[#10B981]/50 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <span className="text-sm text-[#9CA3AF]">
                {searchResults.length} result
                {searchResults.length === 1 ? "" : "s"} found
              </span>
              <div className="flex items-center gap-2 text-xs">
                <span className="mr-1 text-[#9CA3AF]">Sort by:</span>
                {["rating", "wait", "distance"].map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSortBy(option)}
                    className={`rounded-full border border-[#374151] px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs text-[#9CA3AF] transition hover:text-white ${sortBy === option ? "bg-[#10B981] text-[#111827] border-[#10B981]" : ""}`}
                  >
                    {option === "rating"
                      ? "Rating"
                      : option === "wait"
                        ? "Wait"
                        : "Distance"}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="grid flex-1 gap-4 overflow-y-auto p-5 sm:grid-cols-2">
            {searchResults.length === 0 ? (
              <div className="col-span-2 flex flex-col items-center justify-center p-10 text-center">
                <div className="mb-4 text-5xl">😕</div>
                <p className="font-semibold text-white">No results found.</p>
                <p className="mt-1 text-sm text-[#9CA3AF]">
                  Try another search.
                </p>
              </div>
            ) : (
              searchResults.map((org) => {
                const s = STATUS_MAP[org.status as keyof typeof STATUS_MAP];
                const waitText =
                  org.status === "closed"
                    ? "--"
                    : `Next token in ${org.wait} min`;
                return (
                  <div
                    key={org.name}
                    className="result-card flex flex-col rounded-xl p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="text-base font-bold leading-snug text-white">
                          {org.name}
                        </h3>
                        <span className="mt-2 inline-flex items-center rounded-full border border-[#F59E0B]/25 bg-[#F59E0B]/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.2em] text-[#FDE68A]">
                          Mock Data
                        </span>
                      </div>
                      <span
                        className={`inline-flex shrink-0 items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${s.ring} ${s.text}`}
                      >
                        <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                        {s.label}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1.5 text-sm text-[#9CA3AF]">
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5" />
                        {org.distance} km away
                      </div>
                      <div className="flex items-center gap-1.5">
                        <Clock3 className="h-3.5 w-3.5" />
                        {waitText}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => openBooking(org)}
                      className="mt-4 w-full rounded-lg bg-[#10B981] py-2.5 text-sm font-semibold text-[#111827] transition hover:bg-[#10B981]/90"
                    >
                      View &amp; Book
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      <div
        className={`fade-enter fixed inset-0 z-[70] flex items-end justify-center p-0 md:items-center md:p-6 ${showBookingOverlay ? "show" : ""}`}
        role="dialog"
        aria-modal="true"
        aria-label="Booking"
        onClick={closeBooking}
      >
        <div
          className="modal-panel panel-anim flex h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl md:h-auto md:max-h-[85vh] md:max-w-lg md:rounded-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          {renderBookingBody()}
        </div>
      </div>

      {renderContactModal()}
      {renderMyBookingsModal()}

      <a
        href="https://wa.me/"
        target="_blank"
        rel="noreferrer"
        className="fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full bg-[#10B981] text-[#111827] shadow-[0_0_25px_-5px_rgba(16,185,129,0.6)] transition hover:scale-105 hover:bg-[#10B981]/90"
      >
        <MessageCircle className="h-6 w-6" />
      </a>
      {toast ? (
        <div className="fixed bottom-24 left-1/2 z-[100] -translate-x-1/2 rounded-lg border border-[#374151] bg-[#1F2937] px-4 py-2.5 text-sm text-white shadow-lg">
          {toast}
        </div>
      ) : null}
    </div>
  );
}
