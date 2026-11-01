
// ======================================
// M&N BILVERKSTAD – GEMENSAMT SCRIPT
// ======================================

// SUPABASE-INSTÄLLNINGAR
const SUPABASE_URL = "https://cxjbgazjgzjzliipbmft.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MoJrBn18_9KBNOFS8-B35A__iuhGI31";

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
}

// ======================================
// ÅRTAL I SIDFOTEN
// ======================================

document.querySelectorAll(".year").forEach((element) => {
  element.textContent = new Date().getFullYear();
});

// ======================================
// SUPABASE-KLIENT
// ======================================

let supabaseClient = null;

if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
  supabaseClient = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_ANON_KEY
  );
}

// ======================================
// DATUM ENLIGT SVENSK TID
// ======================================

function getTodayInStockholm() {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Stockholm",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(new Date());
}

// ======================================
// BOKNINGSSYSTEM
// ======================================

const bookingForm = document.getElementById("bookingForm");

if (bookingForm) {
  const submitButton = document.getElementById("bookingSubmit");
  const formMessage = document.getElementById("formMessage");
  const dateInput = document.getElementById("preferred_date");
  const timeInput = document.getElementById("preferred_time");

  const availableTimes = [
    "08:00",
    "09:30",
    "11:00",
    "12:30",
    "14:00",
    "15:30",
    "17:00"
  ];

  function showBookingMessage(text, type = "") {
    if (!formMessage) return;

    formMessage.textContent = text;
    formMessage.className = "form-message " + type;
  }

  function resetTimeOptions(message = "Välj datum först") {
    if (!timeInput) return;

    timeInput.replaceChildren();

    const option = document.createElement("option");
    option.value = "";
    option.textContent = message;

    timeInput.appendChild(option);
    timeInput.disabled = true;
  }

  // Minsta tillåtna datum är idag.
  if (dateInput) {
    dateInput.min = getTodayInStockholm();
  }

  // ======================================
  // HÄMTA UPPTAGNA TIDER
  // ======================================

  async function loadAvailableTimes() {
    if (!dateInput || !timeInput) return;

    const selectedDate = dateInput.value;

    resetTimeOptions("Hämtar lediga tider...");

    if (!selectedDate) {
      resetTimeOptions("Välj datum först");
      return;
    }

    if (selectedDate < getTodayInStockholm()) {
      resetTimeOptions("Välj ett framtida datum");
      return;
    }

    if (!supabaseClient) {
      resetTimeOptions("Bokningssystemet är inte anslutet");
      showBookingMessage(
        "Bokningssystemet är inte tillgängligt just nu. Kontakta verkstaden direkt.",
        "error"
      );
      return;
    }

    const { data, error } = await supabaseClient.rpc(
      "get_booked_slots",
      {
        p_date: selectedDate
      }
    );

    if (error) {
      console.error("Fel vid hämtning av bokade tider:", error);

      resetTimeOptions("Kunde inte hämta tider");

      showBookingMessage(
        "Det gick inte att hämta lediga tider. Försök igen senare eller kontakta verkstaden.",
        "error"
      );

      return;
    }

    // Gör om databasens tider till formatet HH:MM.
    const bookedTimes = (data || []).map((item) =>
      String(item.booked_time).substring(0, 5)
    );

    const freeTimes = availableTimes.filter(
      (time) => !bookedTimes.includes(time)
    );

    timeInput.replaceChildren();

    const firstOption = document.createElement("option");
    firstOption.value = "";

    if (freeTimes.length === 0) {
      firstOption.textContent = "Inga lediga tider denna dag";
      timeInput.appendChild(firstOption);
      timeInput.disabled = true;
      return;
    }

    firstOption.textContent = "Välj en tid";
    timeInput.appendChild(firstOption);

    freeTimes.forEach((time) => {
      const option = document.createElement("option");
      option.value = time;
      option.textContent = time;

      timeInput.appendChild(option);
    });

    timeInput.disabled = false;

    showBookingMessage("");
  }

  // Uppdatera tider när datumet ändras.
  if (dateInput && timeInput) {
    dateInput.addEventListener("change", loadAvailableTimes);
  }

  // ======================================
  // SKICKA BOKNINGSFÖRFRÅGAN
  // ======================================

  bookingForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    if (!bookingForm.reportValidity()) return;

    if (!supabaseClient) {
      showBookingMessage(
        "Bokningssystemet är inte anslutet. Kontakta verkstaden direkt.",
        "error"
      );
      return;
    }

    const name = document.getElementById("name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("email").value.trim();
    const car = document.getElementById("car").value.trim();
    const service = document.getElementById("service").value;
    const preferredDate = dateInput.value;
    const preferredTime = timeInput.value;
    const messageText = document.getElementById("message").value.trim();

    if (!name || !phone || !service || !preferredDate || !preferredTime) {
      showBookingMessage(
        "Fyll i alla obligatoriska fält och välj datum och tid.",
        "error"
      );
      return;
    }

    if (preferredDate < getTodayInStockholm()) {
      showBookingMessage(
        "Du kan inte välja ett datum som redan har passerat.",
        "error"
      );
      return;
    }

    if (!availableTimes.includes(preferredTime)) {
      showBookingMessage(
        "Välj en giltig bokningstid.",
        "error"
      );
      return;
    }

    submitButton.disabled = true;
    submitButton.textContent = "Skickar...";

    showBookingMessage("Skickar din bokningsförfrågan...");

    try {
      const { error } = await supabaseClient
        .from("bookings")
        .insert({
          name: name,
          phone: phone,
          email: email || null,
          car: car || null,
          service: service,
          preferred_date: preferredDate,
          preferred_time: preferredTime,
          message: messageText || null,
          status: "Ny"
        });

      if (error) {
        console.error("Booking error:", error);

        // Databasen stoppar dubbelbokningar.
        if (error.code === "23505") {
          showBookingMessage(
            "Tyvärr har någon annan hunnit boka den tiden. Välj en annan tid.",
            "error"
          );

          await loadAvailableTimes();
          return;
        }

        showBookingMessage(
          "Det gick inte att skicka bokningsförfrågan. Försök igen eller kontakta verkstaden.",
          "error"
        );

        return;
      }

      bookingForm.reset();

      dateInput.min = getTodayInStockholm();

      resetTimeOptions("Välj datum först");

      showBookingMessage(
        "Tack! Din bokningsförfrågan har skickats. Verkstaden kontaktar dig för att bekräfta tiden.",
        "success"
      );

    } catch (error) {
      console.error("Unexpected booking error:", error);

      showBookingMessage(
        "Ett oväntat fel uppstod. Försök igen senare eller kontakta verkstaden.",
        "error"
      );

    } finally {
      submitButton.disabled = false;
      submitButton.textContent = "Skicka bokningsförfrågan";
    }
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

        expiry.textContent =
          "Informationen gäller till och med " + formattedDate;

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
