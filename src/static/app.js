document.addEventListener("DOMContentLoaded", () => {
  const activitiesList = document.getElementById("activities-list");
  const activitySelect = document.getElementById("activity");
  const signupForm = document.getElementById("signup-form");
  const messageDiv = document.getElementById("message");

  // Function to fetch activities from API
  async function fetchActivities() {
    try {
      const response = await fetch("/activities");
      const activities = await response.json();

      // Clear loading message
      activitiesList.innerHTML = "";
      // Reset activity select to prevent duplicated options on refresh
      activitySelect.innerHTML = '<option value="">-- Select an activity --</option>';

      // Populate activities list
      Object.entries(activities).forEach(([name, details]) => {
        const activityCard = document.createElement("div");
        activityCard.className = "activity-card";

        const spotsLeft = details.max_participants - details.participants.length;
        // Build participants section (bulleted list) or a friendly empty state
        const participantsHtml = (details.participants && details.participants.length > 0)
          ? `<div class="participants"><h5>Participants</h5><ul>${details.participants.map(p => `<li><span class="participant-email">${p}</span><button class="remove-participant" data-email="${p}" data-activity="${encodeURIComponent(name)}" aria-label="Remove ${p}">×</button></li>`).join('')}</ul></div>`
          : `<div class="participants no-participants">No participants yet</div>`;

        activityCard.innerHTML = `
          <h4>${name}</h4>
          <p>${details.description}</p>
          <p class="availability"><strong>Availability:</strong> ${spotsLeft} spots left</p>
          ${participantsHtml}
        `;

        activitiesList.appendChild(activityCard);

        // Add option to select dropdown
        const option = document.createElement("option");
        option.value = name;
        option.textContent = name;
        activitySelect.appendChild(option);
      });
    } catch (error) {
      activitiesList.innerHTML = "<p>Failed to load activities. Please try again later.</p>";
      console.error("Error fetching activities:", error);
    }
  }

  // Handle form submission
  signupForm.addEventListener("submit", async (event) => {
    event.preventDefault();

    const email = document.getElementById("email").value;
    const activity = document.getElementById("activity").value;

    try {
      const response = await fetch(
        `/activities/${encodeURIComponent(activity)}/signup?email=${encodeURIComponent(email)}`,
        {
          method: "POST",
        }
      );

      const result = await response.json();

      if (response.ok) {
        messageDiv.textContent = result.message;
        messageDiv.className = "success";
        signupForm.reset();
        // Refresh activities to show the new participant
        fetchActivities();
      } else {
        messageDiv.textContent = result.detail || "An error occurred";
        messageDiv.className = "error";
      }

      messageDiv.classList.remove("hidden");

      // Hide message after 5 seconds
      setTimeout(() => {
        messageDiv.classList.add("hidden");
      }, 5000);
    } catch (error) {
      messageDiv.textContent = "Failed to sign up. Please try again.";
      messageDiv.className = "error";
      messageDiv.classList.remove("hidden");
      console.error("Error signing up:", error);
    }
  });

  // Initialize app
  fetchActivities();

  // Delegate click handler for remove buttons inside activity cards (added once)
  activitiesList.addEventListener('click', async (event) => {
    const btn = event.target.closest('.remove-participant');
    if (!btn) return;

    const email = btn.dataset.email;
    const activity = decodeURIComponent(btn.dataset.activity);
    if (!email || !activity) return;

    try {
      const response = await fetch(`/activities/${encodeURIComponent(activity)}/participants?email=${encodeURIComponent(email)}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (response.ok) {
        // Remove the list item from the DOM
        const li = btn.closest('li');
        const ul = li && li.parentElement;
        if (li) li.remove();

        // If no participants left, replace with empty state
        if (ul && ul.children.length === 0) {
          const participantsContainer = ul.closest('.participants');
          if (participantsContainer) {
            participantsContainer.innerHTML = '<div class="participants no-participants">No participants yet</div>';
          }
        }

        // Update availability count by refetching to keep data consistent
        fetchActivities();

        // Show a brief success message
        messageDiv.textContent = result.message || 'Participant removed';
        messageDiv.className = 'success';
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), 4000);
      } else {
        messageDiv.textContent = result.detail || 'Failed to remove participant';
        messageDiv.className = 'error';
        messageDiv.classList.remove('hidden');
        setTimeout(() => messageDiv.classList.add('hidden'), 4000);
      }
    } catch (error) {
      console.error('Error removing participant:', error);
      messageDiv.textContent = 'Failed to remove participant. Try again.';
      messageDiv.className = 'error';
      messageDiv.classList.remove('hidden');
    }
  });
});
