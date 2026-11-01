
// ======================================
// M&N BILVERKSTAD – GEMENSAMT SCRIPT
// ======================================

// Supabase-inställningar
// Använd samma Project URL och Publishable key
// som i admin.html.
const SUPABASE_URL = "DIN_SUPABASE_PROJECT_URL";
const SUPABASE_ANON_KEY = "DIN_SUPABASE_PUBLISHABLE_KEY";

// Mobilmeny
const menuButton = document.querySelector(".menu-toggle");
const navigation = document.querySelector(".main-nav");

if (menuButton && navigation) {
  menuButton.addEventListener("click", () => {
    const isOpen = navigation.classList.toggle("open");
    menuButton.setAttribute("aria-expanded", String(isOpen));
    menuButton.textContent = isOpen ? "×" : "☰";
  });
}

// Årtal i sidfoten
document.querySelectorAll(".year").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// ======================================
// SUPABASE-KLIENT
// ======================================

let supabaseClient = null;

if (
  window.supabase &&
  SUPABASE_URL !== "DIN_SUPABASE_PROJECT_URL" &&
  SUPABASE_ANON_KEY !== "DIN_SUPABASE_PUBLISHABLE_KEY"
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

// Datum enligt svensk tidszon
function getTodayInStockholm() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// ======================================
// BOKNINGSFORMULÄR
// ======================================

const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {
  const submitButton = document.getElementById("bookingSubmit");
  const formMessage = document.getElementById("formMessage");
  const dateInput = document.getElementById("preferred_date");

  function showBookingMessage(text, type = "") {
    formMessage.textContent = text;
    formMessage.className = "form-message " + type;
  }

  if (dateInput) {
    dateInput.min = getTodayInStockholm();
  }

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) return;

    if (!supabaseClient) {
      showBookingMessage(
        "Bokningssystemet är inte anslutet ännu. Kontakta verkstaden direkt.",
        "error"
      );
      return;
    }

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const car = document.getElementById("car").value.trim();
    const service = document.getElementById("service").value;
    const preferredDate = dateInput.value || null;
    const messageText = document.getElementById("message").value.trim();

    if (!name || !phone || !service) {
      showBookingMessage("Fyll i alla obligatoriska fält.", "error");
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Skickar...";
    showBookingMessage("Skickar din bokningsförfrågan...");

    const { error } = await supabaseClient
      .from("bookings")
      .insert({
        name: name,
        phone: phone,
        email: email || null,
        car: car || null,
        service: service,
        preferred_date: preferredDate,
        message: messageText || null
      });

    submitButton.disabled = false;
    submitButton.textContent = "Skicka bokningsförfrågan";

    if (error) {
      console.error("Booking error:", error);
      showBookingMessage(
        "Det gick inte att skicka förfrågan. Försök igen eller kontakta verkstaden direkt.",
        "error"
      );
      return;
    }

    bookingForm.reset();

    if (dateInput) {
      dateInput.min = getTodayInStockholm();
    }

    showBookingMessage(
      "Tack! Din bokningsförfrågan har skickats. Verkstaden kontaktar dig för att bekräfta tiden.",
      "success"
    );
  });
}

// ======================================
// INFORMATION FRÅN ADMINPANELEN
// VISAS PÅ INDEX.HTML
// ======================================

const informationSection = document.getElementById("workshopInformation");
const announcementList = document.getElementById("publicAnnouncementList");

if (informationSection && announcementList) {
  async function loadPublicAnnouncements() {
    if (!supabaseClient) {
      informationSection.hidden = true;
      return;
    }

    const today = getTodayInStockholm();

    const { data, error } = await supabaseClient
      .from("announcements")
      .select("id, title, body, visible_until, created_at")
      .or(`visible_until.is.null,visible_until.gte.${today}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Could not load announcements:", error);
      informationSection.hidden = true;
      return;
    }

    announcementList.replaceChildren();

    if (!data || data.length === 0) {
      informationSection.hidden = true;
      return;
    }

    data.forEach((announcement) => {
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

        const dateParts = announcement.visible_until.split("-");
        const formattedDate =
          `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}`;

        expiry.textContent = "Informationen gäller till och med " + formattedDate;
        card.appendChild(expiry);
      }

      announcementList.appendChild(card);
    });

    informationSection.hidden = false;
  }

  loadPublicAnnouncements();

  // Hämta ny information när besökaren återvänder till fliken.
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadPublicAnnouncements();
    }
  });
}
