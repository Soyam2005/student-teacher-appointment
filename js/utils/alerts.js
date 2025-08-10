/**
 * Shows a Bootstrap alert on the page. The alert is appended to the first element
 * with the id `alertContainer`. If no such element exists, this function does nothing.
 * 
 * @param {string} message The content of the alert.
 * @param {string} [type="info"] The type of alert. One of "info", "success", "warning", "danger".
 * @param {number} [duration=3000] The duration of the alert in ms. If <= 0, the alert will persist until dismissed.
 */
export function showAlert(message, type = "info", duration = 3000) {
    const alertContainer = document.getElementById("alertContainer");
    if(!alertContainer) return;

    const alertBox = document.createElement("div");
    alertBox.className = `alert alert-${type} alert-dismissible fade show`;
    alertBox.role = "alert";
    alertBox.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
    `;

    alertContainer.appendChild(alertBox);
    if(duration > 0){
        setTimeout(() =>{
            alertBox.classList.remove("show");
            alertBox.classList.add("hide");
            setTimeout(() => alertBox.remove(), 500);
        }, duration)
    }
}