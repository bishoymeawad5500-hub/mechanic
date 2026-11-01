
// ======================================
// M&N BILVERKSTAD – GEMENSAMT SCRIPT
// ======================================

const SUPABASE_URL = "https://cxjbgazjgzjzliipbmft.supabase.co";
const SUPABASE_ANON_KEY = "DIN_SUPABASE_PUBLISHABLE_KEY";

let supabaseClient = null;

if (
  window.supabase &&
  SUPABASE_ANON_KEY !== "DIN_SUPABASE_PUBLISHABLE_KEY"
) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

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

// Svenskt datum
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

  function showBookingMessage(message, type = "") {
    formMessage.textContent = message;
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
    const message = document.getElementById("message").value.trim();

    if (!name || !phone || !service) {
      showBookingMessage(
        "Fyll i alla obligatoriska fält.",
        "error"
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Skickar...";

    showBookingMessage("Skickar din bokningsförfrågan...");

    const { error } = await supabaseClient
      .from("bookings")
      .insert({
        name,
        phone,
        email: email || null,
        car: car || null,
        service,
        preferred_date: preferredDate,
        message: message || null
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

    const { data, error } = await supabaseClient
      .from("announcements")
      .select("id, title, body, visible_until, created_at")
      .or(`visible_until.is.null,visible_until.gte.${today}`)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Announcement error:", error);
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

        const parts = announcement.visible_until.split("-");
        expiry.textContent =
          "Informationen gäller till och med " +
          `${parts[2]}/${parts[1]}/${parts[0]}`;

        card.appendChild(expiry);
      }

      announcementList.appendChild(card);
    });

    informationSection.hidden = false;
  }

  loadPublicAnnouncements();

  document.addEventListener("visibilitychange", () => {
    if (!document.hidden) {
      loadPublicAnnouncements();
    }
  });
}
