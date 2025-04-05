/**
 * Inicialização principal do DOM
 */
document.addEventListener("DOMContentLoaded", () => {
    const modal = new bootstrap.Modal(document.getElementById("deleteModal"));

    /**
     * Navega para a seção da página com base no hash
     * @param {string} hash - Hash da URL, como "#home"
     */
    function navigateTo(hash) {
        document.querySelectorAll(".page").forEach(page => {
            page.style.display = "none";
        });

        const activePage = document.querySelector(hash);
        if (activePage) {
            activePage.style.display = "block";

            if (hash === "#home") {
                fetchData();
                checkUserLogin();
            }

            if (hash === "#perfil") {
                checkStoredData();
            }

            if (hash === "#minha-lista") {
                fetchUserAppointments();
                checkUserLogin();
            }
        }
    }

    /**
     * Busca dados de locais com carregadores disponíveis
     */
    function fetchData() {
        fetch("http://127.0.0.1:5000/api/locations/locations_with_chargers")
            .then(response => response.json())
            .then(data => {
                const tableBody = document.querySelector("#home table tbody");
                tableBody.innerHTML = "";

                data.forEach((item) => {
                    const status = item.chargers[0].status;
                    const deleteIcon = status === "available"
                        ? `<img id="icon-${item.id}" class="location-icon" src="./assets/add_location_alt_30dp_000000_FILL0_wght400_GRAD0_opsz24.svg" alt="Ícone">`
                        : "";

                    const row = document.createElement("tr");
                    row.innerHTML = `
                        <th scope="row">${item.name}</th>
                        <td>${item.address}</td>
                        <td>${getStatusIcon(status)}</td>
                        <td>${deleteIcon}</td>
                    `;
                    tableBody.appendChild(row);

                    if (status === "available") {
                        document.getElementById(`icon-${item.id}`).addEventListener("click", () => {
                            document.getElementById("formLocal").value = item.name;
                            document.getElementById("formLocal").setAttribute("disabled", "true");

                            document.getElementById("formEndreco").value = item.address;
                            document.getElementById("formEndreco").setAttribute("disabled", "true");

                            document.getElementById("confirmAppointment").setAttribute("data-id", item.id);

                            modal.show();

                            flatpickr("#date-picker", {
                                enableTime: true,
                                dateFormat: "d/m/Y H:i",
                                time_24hr: true,
                                minDate: "today",
                                onChange: function (selectedDates) {
                                    if (selectedDates.length > 0) {
                                        const selectedDate = selectedDates[0];
                                        const newDate = new Date(selectedDate.getTime() + 4 * 60 * 60 * 1000);
                                        endPicker.setDate(newDate, true);
                                    }
                                }
                            });

                            const endPicker = flatpickr("#date-end-picker", {
                                enableTime: true,
                                dateFormat: "d/m/Y H:i",
                                time_24hr: true,
                                minDate: "today",
                                clickOpens: false
                            });
                        });
                    }
                });
            })
            .catch(error => console.error("Erro ao buscar dados:", error));
    }

    /**
     * Converte uma data no formato "dd/mm/yyyy hh:mm" para ISO string
     * @param {string} dateStr
     * @returns {string}
     */
    function formatDate(dateStr) {
        const [day, month, yearAndTime] = dateStr.split("/");
        const [year, time] = yearAndTime.split(" ");
        return `${year}-${month}-${day}T${time}`;
    }

    /**
     * Retorna ícone de status baseado no status do carregador
     * @param {string} status
     * @returns {string}
     */
    function getStatusIcon(status) {
        switch (status) {
            case "available":
                return '<img src="./assets/check_24dp_229A00_FILL0_wght400_GRAD0_opsz24.svg" />';
            case "maintenance":
                return '<img src="./assets/construction_24dp_FFC222_FILL0_wght400_GRAD0_opsz24.svg" />';
            case "unavailable":
                return '<img src="./assets/close_24dp_970700_FILL0_wght400_GRAD0_opsz24.svg" />';
            default:
                return "";
        }
    }

    /**
     * Verifica se há dados salvos no localStorage para preencher o formulário de perfil
     */
    function checkStoredData() {
        const storedData = JSON.parse(localStorage.getItem("localData"));
        const form = document.getElementById("registerForm");
        const nameField = document.getElementById("name");
        const emailField = document.getElementById("email");
        const passwordField = document.getElementById("password");
        const passwordArea = document.getElementById("mb-3");
        const submitButton = form.querySelector("button[type='submit']");
        const toggleRegister = document.getElementById("toggleRegister");
        const loginForm = document.getElementById("loginForm");

        if (storedData) {
            nameField.value = storedData.name;
            emailField.value = storedData.email;
            passwordField.value = storedData.password;

            nameField.setAttribute("disabled", "true");
            emailField.setAttribute("disabled", "true");
            toggleRegister.setAttribute("disabled", "true");

            toggleRegister.checked = true;
            registerForm.style.display = "block";
            passwordArea.style.display = "none";
            loginForm.style.display = "none";

            if (submitButton) submitButton.style.display = "none";

            if (!document.getElementById("logoutButton")) {
                const logoutButton = document.createElement("button");
                logoutButton.id = "logoutButton";
                logoutButton.className = "btn btn-warning mt-3";
                logoutButton.innerText = "Deslogar";
                logoutButton.addEventListener("click", () => {
                    localStorage.removeItem("localData");
                    alert("Você foi deslogado. Faça login novamente.");
                    navigateTo("#perfil");
                    location.reload();
                });
                form.appendChild(logoutButton);
            }
        } else {
            nameField.removeAttribute("disabled");
            emailField.removeAttribute("disabled");
            passwordField.removeAttribute("disabled");

            if (submitButton) submitButton.style.display = "block";

            const logoutButton = document.getElementById("logoutButton");
            if (logoutButton) logoutButton.remove();
        }
    }

    /**
     * Busca os agendamentos do usuário logado
     */
    async function fetchUserAppointments() {
        const userData = JSON.parse(localStorage.getItem("localData"));
        try {
            const response = await fetch(`http://127.0.0.1:5000/api/appointments/${userData.id}`);
            if (!response.ok) throw new Error("Erro ao buscar agendamentos");

            const appointments = await response.json();
            const tableBody = document.querySelector("#appointmentsTable tbody");
            const alertDiv = document.querySelector("#noAppointmentsAlert");

            tableBody.innerHTML = "";
            if (appointments.length === 0) {
                alertDiv.style.display = "block";
                return;
            }

            alertDiv.style.display = "none";

            appointments.forEach(ap => {
                const row = document.createElement("tr");
                row.id = `appointment-${ap.id}`;
                row.innerHTML = `
                    <td>${ap.local}</td>
                    <td>${ap.endereco}</td>
                    <td>
                    ${ap.status === "confirmed" ? `
                     <img src="./assets/check_circle_24dp_008000_FILL0_wght400_GRAD0_opsz24.svg" alt="Confirmado" width="20" height="20">
                     ` : ap.status}
                    </td>
                    <td>
                    <button class="btn btn-danger btn-sm delete-btn" data-id="${ap.id}">Excluir</button>
                    </td>
                `;
                tableBody.appendChild(row);
            });

            document.querySelectorAll(".delete-btn").forEach(button => {
                button.addEventListener("click", function () {
                    const appointmentId = this.getAttribute("data-id");
                    deleteAppointment(appointmentId);
                });
            });

        } catch (error) {
            console.error("Erro ao buscar agendamentos:", error);
        }
    }

    /**
     * Exclui um agendamento específico
     * @param {string|number} appointmentId
     */
    async function deleteAppointment(appointmentId) {
        try {
            await fetch(`http://127.0.0.1:5000/api/appointments/${appointmentId}`, {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            document.getElementById(`appointment-${appointmentId}`).remove();
            alert("Agendamento excluído com sucesso!");
        } catch (error) {
            console.error("Erro ao excluir agendamento:", error);
            alert("Erro ao excluir o agendamento. Tente novamente.");
        }
    }

    /**
     * Verifica se o usuário está logado
     */
    function checkUserLogin() {
        const userData = localStorage.getItem("localData");
        if (!userData) {
            location.hash = "#perfil";
            mostrarAlertaBootstrap("Você não está logado. Faça login ou cadastre-se.", "warning");
        }
    }

    /**
     * Mostra alerta Bootstrap na tela
     * @param {string} mensagem - Texto do alerta
     * @param {string} [tipo="info"] - Tipo de alerta Bootstrap (info, warning, danger, etc.)
     */
    function mostrarAlertaBootstrap(mensagem, tipo = "info") {
        const container = document.querySelector("#app");
        const alertDiv = document.createElement("div");

        alertDiv.className = `alert alert-${tipo} alert-dismissible fade show mt-3`;
        alertDiv.setAttribute("role", "alert");
        alertDiv.innerHTML = `
            ${mensagem}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Fechar"></button>
        `;

        container.prepend(alertDiv);

        setTimeout(() => {
            const alertInstance = bootstrap.Alert.getOrCreateInstance(alertDiv);
            alertInstance.close();
        }, 5000);
    }

    /**
     * Evento para criação de agendamento
     */
    document.getElementById("confirmAppointment").addEventListener("click", function () {
        const localName = document.getElementById("formLocal").value;
        const userEmail = JSON.parse(localStorage.getItem("localData")).email;
        const startTime = formatDate(document.getElementById("date-picker").value);
        const endTime = formatDate(document.getElementById("date-end-picker").value);

        const requestData = {
            local: localName,
            email: userEmail,
            start_time: startTime,
            end_time: endTime
        };

        fetch("http://127.0.0.1:5000/api/appointments/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(requestData)
        })
            .then(response => {
                if (!response.ok) throw new Error("Erro ao cadastrar o agendamento");
                return response.json();
            })
            .then(data => {
                alert("Agendamento cadastrado com sucesso!");
                modal.hide();
            })
            .catch(error => {
                console.error("Erro ao cadastrar o agendamento:", error);
                alert("Falha ao cadastrar o agendamento. Tente novamente.");
            });

        document.getElementById("date-picker").value = "";
        document.getElementById("date-end-picker").value = "";
    });

    /**
     * Eventos de navegação por hash
     */
    window.addEventListener("hashchange", () => navigateTo(location.hash));

    document.querySelectorAll('a.nav-link').forEach(link => {
        link.addEventListener('click', (event) => {
            event.preventDefault();
            const targetHash = event.target.getAttribute('href') || event.target.closest('a').getAttribute('href');
            if (targetHash) {
                location.hash = targetHash;
                navigateTo(location.hash);
            }
        });
    });

    /**
     * Submissão do formulário de cadastro
     */
    document.getElementById("registerForm").addEventListener("submit", (event) => {
        event.preventDefault();

        const name = document.getElementById("name").value;
        const email = document.getElementById("email").value;
        const password = document.getElementById("password").value;

        const formData = { name, email, password };

        fetch("http://127.0.0.1:5000/api/users/", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        })
            .then(response => {
                if (!response.ok) throw new Error("Erro ao cadastrar usuário");
                return response.json();
            })
            .then(data => {
                alert("Usuário cadastrado com sucesso!");

                localStorage.setItem("localData", JSON.stringify({
                    id: data.id,
                    name: data.name,
                    email: data.email
                }));
                navigateTo("#home");
            })
            .catch(error => {
                console.error("Erro ao cadastrar usuário:", error);
                alert("Erro ao cadastrar usuário. Tente novamente.");
            });
    });

    /**
     * Submissão do formulário de login
     */
    document.getElementById("loginForm").addEventListener("submit", (event) => {
        event.preventDefault();

        const email = document.getElementById("loginEmail").value;
        const password = document.getElementById("loginPassword").value;

        const formData = { email, password };

        fetch("http://127.0.0.1:5000/api/users/login", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(formData)
        })
            .then(response => {
                if (!response.ok) throw new Error("Erro ao logar usuário");
                return response.json();
            })
            .then(data => {
                alert("Usuário logado com sucesso!");
                localStorage.setItem("localData", JSON.stringify(data));
                navigateTo("#home");
                fetchData();
            })
            .catch(error => {
                console.error("Erro ao logar usuário:", error);
                alert("Erro ao logar. Tente novamente.");
            });
    });

    if (!location.hash) {
        location.hash = "#home";
    } else {
        navigateTo(location.hash);
    }
});

/**
 * Alterna entre formulário de cadastro e login
 */
document.addEventListener("DOMContentLoaded", function () {
    const toggleRegister = document.getElementById("toggleRegister");
    const registerForm = document.getElementById("registerForm");
    const loginForm = document.getElementById("loginForm");

    toggleRegister.addEventListener("change", function () {
        const isChecked = this.checked;
        registerForm.style.display = isChecked ? "block" : "none";
        loginForm.style.display = isChecked ? "none" : "block";
    });
});
