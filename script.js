
// ======================================
// M&N BILVERKSTAD – GEMENSAMT SCRIPT
// ======================================

const SUPABASE_URL = "https://cxjbgazjgzjzliipbmft.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MoJrBn18_9KBNOFS8-B35A__iuhGI31";

let supabaseClient = null;

if (window.supabase) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
} else {
  console.error("Supabase kunde inte laddas.");
}

// ======================================
// GEMENSAMMA FUNKTIONER
// ======================================

function getTodayInStockholm() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(new Date());

  const values = {};

  parts.forEach(part => {
    values[part.type] = part.value;
  });

  return `${values.year}-${values.month}-${values.day}`;
}

function showMessage(element, message, type = "") {
  if (!element) return;

  element.textContent = message;
  element.className = "form-message " + type;
}

function formatDate(date) {
  if (!date) return "Ej angivet";

  const parts = date.split("-");

  if (parts.length !== 3) return date;

  return `${parts[2]}/${parts[1]}/${parts[0]}`;
}

// ======================================
// MOBILMENY
// ======================================

const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");

    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = isOpen ? "×" : "☰";
  });

  navigation.querySelectorAll("a").forEach(link => {
    link.addEventListener("click", () => {
      navigation.classList.remove("open");
      menuButton.setAttribute("aria-expanded", "false");
      menuButton.textContent = "☰";
    });
  });
}

// ======================================
// ÅRTAL I SIDFOTEN
// ======================================

document.querySelectorAll(".year").forEach(element => {
  element.textContent = new Date().getFullYear();
});

// ======================================
// BOKNINGSTIDER
// ======================================

const BOOKING_TIMES = [
  "08:00",
  "09:30",
  "11:00",
  "12:30",
  "14:00",
  "15:30",
  "17:00"
];

function getBookingDateInput() {
  return (
    document.getElementById("preferred_date") ||
    document.getElementById("date")
  );
}

function getBookingTimeInput() {
  return (
    document.getElementById("preferred_time") ||
    document.getElementById("time")
  );
}

// ======================================
// HÄMTA UPPTAGNA TIDER
// ======================================

async function loadAvailableTimes() {
  const dateInput = getBookingDateInput();
  const timeSelect = getBookingTimeInput();

  if (!dateInput || !timeSelect) return;

  const selectedDate = dateInput.value;

  timeSelect.replaceChildren();
  timeSelect.disabled = true;

  const firstOption = document.createElement("option");
  firstOption.value = "";

  if (!selectedDate) {
    firstOption.textContent = "Välj först ett datum";
    timeSelect.appendChild(firstOption);
    timeSelect.disabled = false;
    return;
  }

  if (!supabaseClient) {
    firstOption.textContent = "Bokningssystemet är inte anslutet";
    timeSelect.appendChild(firstOption);
    return;
  }

  firstOption.textContent = "Hämtar lediga tider...";
  timeSelect.appendChild(firstOption);

  try {
    const { data, error } = await supabaseClient.rpc(
      "get_booked_slots",
      {
        p_date: selectedDate
      }
    );

    if (error) throw error;

    // Gör om upptagna tider till formatet HH:MM
    const bookedTimes = (data || []).map(row =>
      String(row.booked_time).slice(0, 5)
    );

    // Visa endast tider som inte redan är bokade
    const availableTimes = BOOKING_TIMES.filter(
      time => !bookedTimes.includes(time)
    );

    timeSelect.replaceChildren();

    const chooseOption = document.createElement("option");
    chooseOption.value = "";

    if (availableTimes.length === 0) {
      chooseOption.textContent = "Inga lediga tider denna dag";
    } else {
      chooseOption.textContent = "Välj en ledig tid";
    }

    timeSelect.appendChild(chooseOption);

    availableTimes.forEach(time => {
      const option = document.createElement("option");

      option.value = time;
      option.textContent = time;

      timeSelect.appendChild(option);
    });

  } catch (error) {
    console.error("Fel vid hämtning av tider:", error);

    timeSelect.replaceChildren();

    const errorOption = document.createElement("option");
    errorOption.value = "";
    errorOption.textContent = "Kunde inte hämta tider – försök igen";

    timeSelect.appendChild(errorOption);

  } finally {
    timeSelect.disabled = false;
  }
}

// ======================================
// AKTIVERA DATUM OCH TIDER
// ======================================

function setupBookingTimes() {
  const dateInput = getBookingDateInput();

  if (!dateInput) return;

  dateInput.min = getTodayInStockholm();

  dateInput.addEventListener("change", () => {
    loadAvailableTimes();
  });

  loadAvailableTimes();
}

setupBookingTimes();

// ======================================
// BOKNINGSFORMULÄR
// ======================================

const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {
  const submitButton =
    document.getElementById("submitButton") ||
    document.getElementById("bookingSubmit") ||
    bookingForm.querySelector('[type="submit"]');

  const formMessage = document.getElementById("formMessage");

  const getInput = (...ids) => {
    for (const id of ids) {
      const element = document.getElementById(id);

      if (element) return element;
    }

    return null;
  };

  bookingForm.addEventListener("submit", async event => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) return;

    if (!supabaseClient) {
      showMessage(
        formMessage,
        "Bokningssystemet kunde inte ansluta. Försök igen senare.",
        "error"
      );
      return;
    }

    const name = getInput("name")?.value.trim() || "";
    const phone = getInput("phone")?.value.trim() || "";
    const email = getInput("email")?.value.trim() || "";
    const car = getInput("car")?.value.trim() || "";
    const service = getInput("service")?.value || "";

    const dateInput = getBookingDateInput();
    const timeInput = getBookingTimeInput();

    const preferredDate = dateInput?.value || "";
    const preferredTime = timeInput?.value || "";

    const message = getInput("message")?.value.trim() || "";

    if (
      !name ||
      !phone ||
      !service ||
      !preferredDate ||
      !preferredTime
    ) {
      showMessage(
        formMessage,
        "Fyll i namn, telefon, tjänst, datum och tid.",
        "error"
      );
      return;
    }

    if (preferredDate < getTodayInStockholm()) {
      showMessage(
        formMessage,
        "Du kan inte välja ett datum som redan har passerat.",
        "error"
      );
      return;
    }

    if (!BOOKING_TIMES.includes(preferredTime)) {
      showMessage(
        formMessage,
        "Välj en giltig bokningstid.",
        "error"
      );
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Skickar...";
    }

    showMessage(
      formMessage,
      "Skickar din bokningsförfrågan..."
    );

    try {
      const booking = {
        name: name,
        phone: phone,
        email: email || null,
        car: car || null,
        service: service,
        preferred_date: preferredDate,
        preferred_time: preferredTime,
        message: message || null,
        status: "Ny"
      };

      const { error } = await supabaseClient
        .from("bookings")
        .insert([booking]);

      if (error) throw error;

      bookingForm.reset();

      if (dateInput) {
        dateInput.min = getTodayInStockholm();
      }

      if (timeInput) {
        timeInput.innerHTML =
          '<option value="">Välj först ett datum</option>';
      }

      showMessage(
        formMessage,
        "Tack för din bokningsförfrågan! Vi har tagit emot den och återkommer för att bekräfta tiden.",
        "success"
      );

    } catch (error) {
      console.error("Bokningsfel:", error);

      if (error.code === "23505") {
        showMessage(
          formMessage,
          "Tyvärr! Någon annan har redan bokat den tiden. Välj en annan ledig tid.",
          "error"
        );

        // Uppdatera listan med lediga tider
        await loadAvailableTimes();

      } else {
        showMessage(
          formMessage,
          "Bokningen kunde inte skickas. Försök igen eller kontakta oss via telefon.",
          "error"
        );
      }

    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent = "Skicka bokning";
      }
    }
  });
}

// ======================================
// INFORMATION PÅ HEMSIDAN
// ======================================

const informationSection =
  document.getElementById("workshopInformation");

const announcementList =
  document.getElementById("publicAnnouncementList");

if (informationSection && announcementList) {
  async function loadPublicAnnouncements() {
    if (!supabaseClient) {
      informationSection.hidden = true;
      return;
    }

    const today = getTodayInStockholm();

    try {
      const { data, error } = await supabaseClient
        .from("announcements")
        .select("id, title, body, visible_until, created_at")
        .or(`visible_until.is.null,visible_until.gte.${today}`)
        .order("created_at", { ascending: false });

      if (error) throw error;

      announcementList.replaceChildren();

      if (!data || data.length === 0) {
        informationSection.hidden = true;
        return;
      }

      data.forEach(announcement => {
        const card = document.createElement("article");
        card.className = "public-announcement";

        const heading = document.createElement("h3");
        heading.textContent = announcement.title;

        const body = document.createElement("p");
        body.textContent = announcement.body;

        card.append(heading, body);

        if (announcement.visible_until) {
          const expiry = document.createElement("p");
          expiry.className = "announcement-date";

          expiry.textContent =
            "Informationen gäller till och med " +
            formatDate(announcement.visible_until);

          card.appendChild(expiry);
        }

        announcementList.appendChild(card);
      });

      informationSection.hidden = false;

    } catch (error) {
      console.error("Informationsfel:", error);
      informationSection.hidden = true;
    }
  }

  loadPublicAnnouncements();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadPublicAnnouncements();
    }
  });
}
