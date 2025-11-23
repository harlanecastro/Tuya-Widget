// Variáveis globais
let devices = [];
let currentDevice = null;
let isOnline = false;
let accessToken = "";
let refreshToken = "";
let baseUrl = "https://px1.tuyaeu.com/homeassistant/";
let proxyUrl = "";
let refreshInterval = null;

// Inicialização ao carregar a página
document.addEventListener("DOMContentLoaded", function () {
  initializeWidget();
});

// Limpeza ao fechar
window.addEventListener("beforeunload", function () {
  stopAutoRefresh();
});

function initializeWidget() {
  // Verifica dados de autenticação salvos
  checkSavedAuth();

  // Configura manipuladores de eventos
  setupEventListeners();

  // Configura manipuladores de eventos da bandeja do sistema
  setupTrayEventListeners();

  // Configura botões de press and hold
  setupHoldButtons();

  // Mostra a seção de seleção de dispositivo por padrão
  showDeviceSection();
}

function setupEventListeners() {
  // Manipuladores dos controles deslizantes
  document.getElementById("hueSlider").addEventListener("input", function () {
    updateColorFromHue(this.value);
  });

  document
    .getElementById("brightnessSlider")
    .addEventListener("input", function () {
      updateBrightness(this.value);
    });

  // Manipulador de seleção de dispositivo
  document
    .getElementById("deviceSelect")
    .addEventListener("change", function () {
      selectDevice(this.value);
    });

  // Manipulador Enter para senha
  document.getElementById("password").addEventListener("keydown", function (e) {
    if (e.key === "Enter") {
      doLogin();
    }
  });
}

// Configura botões com press and hold
function setupHoldButtons() {
  const holdButtons = document.querySelectorAll(".hold-btn");

  holdButtons.forEach((button) => {
    // Remove listeners antigos se existirem
    const newButton = button.cloneNode(true);
    button.parentNode.replaceChild(newButton, button);
    const btn = newButton;

    let holdTimer = null;
    let progressTimer = null;
    let holdProgress = 0;
    const holdDuration = 2000; // 2 segundos
    const progressInterval = 50; // Atualiza a cada 50ms

    const resetHold = () => {
      btn.classList.remove("holding");
      const progressBar = btn.querySelector(".hold-progress");
      if (progressBar) {
        progressBar.style.width = "0%";
      }
      holdProgress = 0;
      if (progressTimer) {
        clearInterval(progressTimer);
        progressTimer = null;
      }
      if (holdTimer) {
        clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    const startHold = (e) => {
      e.preventDefault();
      e.stopPropagation();

      // Se já está em progresso, não faz nada
      if (btn.classList.contains("holding")) {
        return;
      }

      btn.classList.add("holding");
      holdProgress = 0;

      // Atualiza a barra de progresso
      const progressBar = btn.querySelector(".hold-progress");
      if (progressBar) {
        progressBar.style.width = "0%";
      }

      // Timer para atualizar o progresso
      progressTimer = setInterval(() => {
        holdProgress += progressInterval;
        const percentage = Math.min((holdProgress / holdDuration) * 100, 100);

        if (progressBar) {
          progressBar.style.width = percentage + "%";
        }

        if (holdProgress >= holdDuration) {
          clearInterval(progressTimer);
          progressTimer = null;
          executeHoldAction(btn);
          resetHold();
        }
      }, progressInterval);

      // Timer principal como backup
      holdTimer = setTimeout(() => {
        if (holdProgress >= holdDuration) {
          executeHoldAction(btn);
        }
        resetHold();
      }, holdDuration);
    };

    const stopHold = (e) => {
      e.preventDefault();
      e.stopPropagation();
      resetHold();
    };

    // Event listeners para mouse
    btn.addEventListener("mousedown", startHold);
    btn.addEventListener("mouseup", stopHold);
    btn.addEventListener("mouseleave", stopHold);

    // Event listeners para touch (mobile)
    btn.addEventListener("touchstart", startHold, { passive: false });
    btn.addEventListener("touchend", stopHold);
    btn.addEventListener("touchcancel", stopHold);

    // Previne o comportamento padrão de clique
    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
    });
  });
}

function executeHoldAction(button) {
  const action = button.getAttribute("data-action");

  if (action === "off") {
    quickAction("off");
  } else if (action === "reboot") {
    rebootDevice();
  }
}

function setupTrayEventListeners() {
  // Escuta eventos da bandeja do sistema
  window.addEventListener("device-selected", (event) => {
    const device = event.detail;
    if (device) {
      // Encontra o dispositivo na lista local
      const localDevice = devices.find((d) => d.id === device.id);
      if (localDevice) {
        selectDevice(device.id);
        showSuccess(`Dispositivo "${device.name || device.id}" selecionado`);
      }
    }
  });

  window.addEventListener("control-device", (event) => {
    const action = event.detail;
    if (action && currentDevice) {
      switch (action) {
        case "turnOn":
          turnDeviceOn();
          break;
        case "turnOff":
          turnDeviceOff();
          break;
      }
    }
  });
}

function checkSavedAuth() {
  const savedAuth = localStorage.getItem("tuya_auth");
  const savedDevices = localStorage.getItem("tuya_devices");

  if (savedAuth && savedDevices) {
    try {
      const authData = JSON.parse(savedAuth);
      const devicesData = JSON.parse(savedDevices);

      // Restaura dados de autenticação
      accessToken = authData.access_token;
      refreshToken = authData.refresh_token;
      isOnline = true;
      baseUrl = authData.baseUrl;
      proxyUrl = authData.proxyUrl;

      // Carrega dispositivos
      devices = devicesData;
      populateDeviceList();

      // Sincroniza dispositivos com o processo principal para a bandeja
      if (window.electronAPI && window.electronAPI.setDevices) {
        window.electronAPI.setDevices(devices);
      }

      if (devices.length > 0) {
        showSuccess("Dispositivos carregados");
      }

      // Inicia atualização automática do token
      startAutoRefresh();
    } catch (error) {
      console.error("Erro ao carregar dados salvos:", error);
      localStorage.removeItem("tuya_auth");
      localStorage.removeItem("tuya_devices");

      // Sincroniza lista vazia de dispositivos com a bandeja
      if (window.electronAPI && window.electronAPI.setDevices) {
        window.electronAPI.setDevices([]);
      }
    }
  } else {
    // Sincroniza lista vazia de dispositivos com a bandeja
    if (window.electronAPI && window.electronAPI.setDevices) {
      window.electronAPI.setDevices([]);
    }
  }
}

function populateDeviceList() {
  const select = document.getElementById("deviceSelect");
  select.innerHTML = '<option value="">Selecione um dispositivo</option>';

  devices.forEach((device) => {
    const option = document.createElement("option");
    option.value = device.id;
    option.textContent = device.name || device.id;
    select.appendChild(option);
  });

  // Sincroniza dispositivos com o processo principal para a bandeja
  if (window.electronAPI && window.electronAPI.setDevices) {
    window.electronAPI.setDevices(devices);
  }
}

function selectDevice(deviceId) {
  if (!deviceId) {
    currentDevice = null;
    hideControlSection();

    // Sincroniza com o processo principal
    if (window.electronAPI && window.electronAPI.setCurrentDevice) {
      window.electronAPI.setCurrentDevice(null);
    }
    return;
  }

  currentDevice = devices.find((d) => d.id === deviceId);
  if (currentDevice) {
    updateDeviceInfo();
    showControlSection();

    // Sincroniza com o processo principal
    if (window.electronAPI && window.electronAPI.setCurrentDevice) {
      window.electronAPI.setCurrentDevice(currentDevice);
    }

    // Mostra notificação sobre a seleção do dispositivo
    showSuccess(
      `Dispositivo "${currentDevice.name || currentDevice.id}" selecionado`
    );
  }
}

function updateDeviceInfo() {
  if (!currentDevice) return;

  // Atualiza o nome do dispositivo
  document.getElementById("deviceName").textContent =
    currentDevice.name || currentDevice.id;

  // Atualiza o indicador de status
  const statusIndicator = document.getElementById("statusIndicator");
  const isOn = currentDevice.data && currentDevice.data.state;
  statusIndicator.className = "status-indicator" + (isOn ? " online" : "");

  // Identifica o tipo do dispositivo
  const deviceType =
    currentDevice.dev_type || currentDevice.ha_type || "unknown";

  // Atualiza informações do dispositivo baseado no tipo
  updateDeviceDetails(deviceType);

  // Mostra/oculta controles baseado no tipo
  showRelevantControls(deviceType);

  // Atualiza o brilho (apenas para lights)
  if (deviceType === "light") {
    const brightness = currentDevice.data && currentDevice.data.brightness;
    if (brightness !== undefined) {
      const displayValue =
        brightness === 0 ? "0% (desligado)" : brightness + "%";
      document.getElementById("deviceBrightness").textContent = displayValue;
      document.getElementById("brightnessSlider").value = brightness || 100;
      document.getElementById("brightnessValue").textContent = brightness + "%";
    } else {
      document.getElementById("deviceBrightness").textContent = "-";
    }
  }

  // Atualiza a bandeja quando o estado do dispositivo muda
  if (
    window.electronAPI &&
    window.electronAPI.updateDeviceState &&
    currentDevice.data
  ) {
    window.electronAPI.updateDeviceState(
      currentDevice.id,
      currentDevice.data.state ? 1 : 0
    );
  }
}

// Atualiza os detalhes exibidos baseado no tipo de dispositivo
function updateDeviceDetails(deviceType) {
  const brightnessDetail = document.getElementById("brightnessDetail");
  const deviceTypeDetail = document.getElementById("deviceTypeDetail");

  if (deviceType === "light") {
    // Para lâmpadas, mostra brilho
    brightnessDetail.style.display = "block";
    deviceTypeDetail.textContent = "";
  } else if (deviceType === "switch") {
    // Para switches, mostra apenas o tipo
    brightnessDetail.style.display = "none";
    const isOn = currentDevice.data && currentDevice.data.state;
    const isOnline = currentDevice.data && currentDevice.data.online;
    let statusText = `Tipo: Interruptor/Tomada`;
    if (isOnline !== undefined) {
      statusText += ` | ${isOnline ? "Online" : "Offline"}`;
    }
    if (isOn !== undefined) {
      statusText += ` | ${isOn ? "Ligado" : "Desligado"}`;
    }
    deviceTypeDetail.textContent = statusText;
  } else {
    // Para outros tipos, mostra informações genéricas
    brightnessDetail.style.display = "none";
    deviceTypeDetail.textContent = `Tipo: ${deviceType}`;
  }
}

// Mostra apenas os controles relevantes para o tipo de dispositivo
function showRelevantControls(deviceType) {
  const brightnessControl = document.getElementById("brightnessControl");
  const colorControl = document.getElementById("colorControl");
  const brightBtn = document.getElementById("brightBtn");
  const dimBtn = document.getElementById("dimBtn");
  const rebootBtn = document.getElementById("rebootBtn");

  if (deviceType === "light") {
    // Para lâmpadas, mostra todos os controles
    brightnessControl.style.display = "block";
    colorControl.style.display = "block";
    brightBtn.style.display = "flex";
    dimBtn.style.display = "flex";
    rebootBtn.style.display = "none";
  } else if (deviceType === "switch") {
    // Para switches/tomadas, mostra ligar/desligar e reboot
    brightnessControl.style.display = "none";
    colorControl.style.display = "none";
    brightBtn.style.display = "none";
    dimBtn.style.display = "none";
    rebootBtn.style.display = "flex";
    // Reconfigura os botões hold quando são mostrados
    setTimeout(() => setupHoldButtons(), 100);
  } else {
    // Para outros tipos, mostra apenas ligar/desligar por padrão
    brightnessControl.style.display = "none";
    colorControl.style.display = "none";
    brightBtn.style.display = "none";
    dimBtn.style.display = "none";
    rebootBtn.style.display = "none";
  }

  // Sempre reconfigura os botões hold quando os controles mudam
  setTimeout(() => setupHoldButtons(), 100);
}

function updateColorFromHue(hue) {
  const color = hslToHex(hue, 100, 50);
  document.getElementById("colorValue").textContent = color;

  if (currentDevice) {
    const deviceType =
      currentDevice.dev_type || currentDevice.ha_type || "unknown";
    // Apenas atualiza cor se for uma lâmpada
    if (deviceType === "light") {
      setDeviceColor(hue, 100, getBrightness());
    }
  }
}

function updateBrightness(brightness) {
  // Converte 0-90 em 10-100 para exibição
  const actualBrightness =
    brightness === 0 ? 0 : Math.round((brightness / 90) * 90 + 10);
  const displayValue =
    brightness === 0 ? "0% (desligado)" : actualBrightness + "%";
  document.getElementById("brightnessValue").textContent = displayValue;

  if (currentDevice) {
    const deviceType =
      currentDevice.dev_type || currentDevice.ha_type || "unknown";
    // Apenas atualiza brilho se for uma lâmpada
    if (deviceType === "light") {
      setDeviceBrightness(actualBrightness);
    }
  }
}

function getBrightness() {
  return parseInt(document.getElementById("brightnessSlider").value);
}

function setDeviceColor(hue, saturation, brightness) {
  if (!currentDevice) return;

  const deviceType =
    currentDevice.dev_type || currentDevice.ha_type || "unknown";

  // Apenas lâmpadas podem mudar de cor
  if (deviceType !== "light") {
    return;
  }

  const colorData = {
    hue: hue,
    saturation: saturation / 100,
    brightness: brightness,
  };

  if (isOnline) {
    controlDeviceOnline("colorSet", "color", colorData);
  } else {
    controlDeviceOffline("colorSet", colorData);
  }

  // Mostra notificação sobre mudança de cor
  const color = hslToHex(hue, saturation, brightness);
  showSuccess(
    `Cor de "${currentDevice.name || currentDevice.id}" alterada para ${color}`
  );
}

function setDeviceBrightness(brightness) {
  if (!currentDevice) return;

  const deviceType =
    currentDevice.dev_type || currentDevice.ha_type || "unknown";

  // Apenas lâmpadas podem ter brilho ajustado
  if (deviceType !== "light") {
    return;
  }

  if (brightness === 0) {
    // Se o brilho for 0, desliga o dispositivo
    if (isOnline) {
      controlDeviceOnline("turnOnOff", "value", 0);
    } else {
      controlDeviceOffline("turnOnOff", 0);
    }
  } else {
    // Se o brilho for maior que 0, liga o dispositivo e define o brilho
    // Converte 10-100 em 0-90 para enviar ao dispositivo
    const deviceBrightness = Math.round(((brightness - 10) / 90) * 90);
    if (isOnline) {
      controlDeviceOnline("turnOnOff", "value", 1);
      controlDeviceOnline("brightnessSet", "value", deviceBrightness);
    } else {
      controlDeviceOffline("turnOnOff", 1);
      controlDeviceOffline("brightnessSet", deviceBrightness);
    }
  }

  // Mostra notificação sobre mudança de brilho
  if (brightness === 0) {
    showSuccess(`Desligando "${currentDevice.name || currentDevice.id}"`);
  } else {
    showSuccess(
      `Brilho de "${
        currentDevice.name || currentDevice.id
      }" definido para ${brightness}%`
    );
  }
}

// Ações rápidas
function quickAction(action) {
  if (!currentDevice) {
    showError("Selecione um dispositivo");
    return;
  }

  const deviceType =
    currentDevice.dev_type || currentDevice.ha_type || "unknown";

  switch (action) {
    case "on":
      if (isOnline) {
        controlDeviceOnline("turnOnOff", "value", 1);
      } else {
        controlDeviceOffline("turnOnOff", 1);
      }
      showSuccess(`Ligando "${currentDevice.name || currentDevice.id}"`);
      break;
    case "off":
      if (isOnline) {
        controlDeviceOnline("turnOnOff", "value", 0);
      } else {
        controlDeviceOffline("turnOnOff", 0);
      }
      showSuccess(`Desligando "${currentDevice.name || currentDevice.id}"`);
      break;
    case "bright":
      // Apenas para lâmpadas
      if (deviceType === "light") {
        document.getElementById("brightnessSlider").value = 100;
        updateBrightness(100);
      }
      break;
    case "dim":
      // Apenas para lâmpadas
      if (deviceType === "light") {
        document.getElementById("brightnessSlider").value = 30;
        updateBrightness(30);
      }
      break;
  }
}

async function controlDeviceOnline(action, valueName, value) {
  try {
    const response = await fetch(proxyUrl + baseUrl + "skill", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        header: {
          name: action,
          namespace: "control",
          payloadVersion: 1,
        },
        payload: {
          accessToken: accessToken,
          devId: currentDevice.id,
          [valueName]: value,
        },
      }),
    });

    const data = await response.json();

    if (data.header && data.header.code === "SUCCESS") {
      // Atualiza o estado local do dispositivo antes de atualizar a interface
      if (currentDevice) {
        if (!currentDevice.data) currentDevice.data = {};

        switch (action) {
          case "turnOnOff":
            currentDevice.data.state = value === 1;
            break;
          case "brightnessSet":
            currentDevice.data.brightness = value;
            break;
          case "colorSet":
            currentDevice.data.color = value;
            break;
        }
      }

      updateDeviceInfo();

      // Atualiza o estado do dispositivo na bandeja
      if (
        action === "turnOnOff" &&
        window.electronAPI &&
        window.electronAPI.updateDeviceState
      ) {
        window.electronAPI.updateDeviceState(currentDevice.id, value === 1);
      }

      return { success: true };
    } else {
      showError("Erro ao executar comando");
      return { success: false, error: data.header?.msg || "Erro desconhecido" };
    }
  } catch (error) {
    console.error("Erro ao controlar dispositivo:", error);
    showError("Erro de rede");
    return { success: false, error: error.message };
  }
}

function controlDeviceOffline(action, value) {
  // No modo offline, atualiza dados locais
  if (currentDevice) {
    if (!currentDevice.data) currentDevice.data = {};

    switch (action) {
      case "turnOnOff":
        currentDevice.data.state = value === 1;
        break;
      case "brightnessSet":
        currentDevice.data.brightness = value;
        break;
      case "colorSet":
        currentDevice.data.color = value;
        break;
    }

    updateDeviceInfo();

    // Atualiza o estado do dispositivo na bandeja
    if (
      action === "turnOnOff" &&
      window.electronAPI &&
      window.electronAPI.updateDeviceState
    ) {
      window.electronAPI.updateDeviceState(currentDevice.id, value === 1);
    }
  }
}

// Funções de autenticação
function toggleAuth() {
  const authSection = document.getElementById("authSection");
  const isVisible = authSection.style.display !== "none";

  if (isVisible) {
    hideAuthSection();
  } else {
    showAuthSection();
  }
}

function showAuthSection() {
  document.getElementById("authSection").style.display = "block";
  hideDeviceSection();
  hideControlSection();
}

function hideAuthSection() {
  document.getElementById("authSection").style.display = "none";
  showDeviceSection();
}

function showDeviceSection() {
  document.querySelector(".device-section").style.display = "block";
}

function hideDeviceSection() {
  document.querySelector(".device-section").style.display = "none";
}

function showControlSection() {
  document.getElementById("controlSection").style.display = "block";
}

function hideControlSection() {
  document.getElementById("controlSection").style.display = "none";
}

async function doLogin() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const region = document.getElementById("region").value;
  const platform = document.getElementById("platform").value;
  const saveAuth = document.getElementById("saveAuth").checked;

  if (!username || !password) {
    showLoginError("Digite o login e a senha");
    return;
  }

  showLoading(true);

  try {
    const loginResult = await login(username, password, region, platform);

    if (loginResult.success) {
      accessToken = loginResult.access_token;
      refreshToken = loginResult.refresh_token;
      isOnline = true;

      // Atualiza URL dependendo da região
      updateBaseUrl(region);

      // Carrega dispositivos online
      const deviceResult = await getDeviceList();
      if (deviceResult.success) {
        devices = deviceResult.devices;
        populateDeviceList();

        // Sincroniza dispositivos com o processo principal para a bandeja
        if (window.electronAPI && window.electronAPI.setDevices) {
          window.electronAPI.setDevices(devices);
        }

        // Reseta o dispositivo atual ao fazer novo login
        currentDevice = null;
        if (window.electronAPI && window.electronAPI.setCurrentDevice) {
          window.electronAPI.setCurrentDevice(null);
        }
        hideControlSection();

        // Salva dados de autenticação e dispositivos apenas se a caixa estiver marcada
        if (saveAuth) {
          saveAuthData(username, password, region, platform);
          saveDevicesData(devices);
        }

        // Inicia atualização automática do token
        startAutoRefresh();

        showSuccess("Autenticação bem-sucedida");
        hideAuthSection();
      } else {
        showLoginError("Não foi possível carregar os dispositivos");
      }
    } else {
      showLoginError("Erro de autenticação");
    }
  } catch (error) {
    console.error("Erro de autenticação:", error);
    showLoginError("Erro de rede");
  }

  showLoading(false);
}

async function login(username, password, region, platform) {
  let url = baseUrl + "auth.do";

  if (region === "1") {
    url = baseUrl.replace("eu", "us") + "auth.do";
  } else if (region === "86") {
    url = baseUrl.replace("eu", "cn") + "auth.do";
  }

  const headers = {
    "Content-Type": "application/x-www-form-urlencoded",
  };

  const data = {
    userName: username,
    password: password,
    countryCode: region,
    bizType: platform,
    from: "tuya",
  };

  const response = await fetch(proxyUrl + url, {
    method: "POST",
    headers: headers,
    body: new URLSearchParams(data),
  });

  const result = await response.json();

  if (result.access_token) {
    return {
      success: true,
      access_token: result.access_token,
      refresh_token: result.refresh_token,
      expires_in: result.expires_in,
    };
  } else {
    return { success: false };
  }
}

async function getDeviceList() {
  const url = baseUrl + "skill";
  const headers = {
    "Content-Type": "application/json",
  };

  const data = {
    header: {
      name: "Discovery",
      namespace: "discovery",
      payloadVersion: 1,
    },
    payload: {
      accessToken: accessToken,
    },
  };

  const response = await fetch(proxyUrl + url, {
    method: "POST",
    headers: headers,
    body: JSON.stringify(data),
  });

  const result = await response.json();

  if (result.payload && result.payload.devices) {
    return {
      success: true,
      devices: result.payload.devices,
    };
  } else {
    return { success: false };
  }
}

function updateBaseUrl(region) {
  if (region === "1") {
    baseUrl = baseUrl.replace("eu", "us");
  } else if (region === "86") {
    baseUrl = baseUrl.replace("eu", "cn");
    proxyUrl = "https://cors-anywhere.herokuapp.com/";
  }
}

// Funções para trabalhar com refresh token
async function refreshAccessToken() {
  if (!refreshToken) {
    console.error("Não há refresh token");
    return false;
  }

  try {
    const url = baseUrl + "access.do";
    const params = new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      rand: Math.random(),
    });

    const response = await fetch(proxyUrl + url + "?" + params.toString(), {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    const result = await response.json();

    if (result.access_token) {
      accessToken = result.access_token;
      refreshToken = result.refresh_token;

      // Atualiza dados salvos
      const savedAuth = localStorage.getItem("tuya_auth");
      if (savedAuth) {
        const authData = JSON.parse(savedAuth);
        authData.access_token = accessToken;
        authData.refresh_token = refreshToken;
        localStorage.setItem("tuya_auth", JSON.stringify(authData));
      }

      console.log("Token atualizado com sucesso");
      return true;
    } else {
      console.error("Erro ao atualizar token:", result);
      return false;
    }
  } catch (error) {
    console.error("Erro ao atualizar token:", error);
    return false;
  }
}

function startAutoRefresh() {
  // Para o intervalo anterior se existir
  if (refreshInterval) {
    clearInterval(refreshInterval);
  }

  // Inicia atualização a cada 2 minutos (120000 ms)
  refreshInterval = setInterval(async () => {
    if (isOnline && refreshToken) {
      console.log("Atualização automática do token...");
      await refreshAccessToken();
    }
  }, 120000);
}

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

function saveAuthData(username, password, region, platform) {
  const authData = {
    username: username,
    password: password,
    region: region,
    platform: platform,
    access_token: accessToken,
    refresh_token: refreshToken,
    baseUrl: baseUrl,
    proxyUrl: proxyUrl,
  };
  localStorage.setItem("tuya_auth", JSON.stringify(authData));
}

function saveDevicesData(devices) {
  localStorage.setItem("tuya_devices", JSON.stringify(devices));

  // Sincroniza dispositivos com o processo principal para a bandeja
  if (window.electronAPI && window.electronAPI.setDevices) {
    window.electronAPI.setDevices(devices);
  }
}

// Funções de importação/exportação
function importAuth() {
  const username = document.getElementById("username").value;
  const password = document.getElementById("password").value;
  const region = document.getElementById("region").value;
  const platform = document.getElementById("platform").value;

  if (!username || !password) {
    showLoginError("Digite o login e a senha para importar autenticação");
    return;
  }

  // Salva dados de autenticação sem tentar fazer login
  saveAuthData(username, password, region, platform);

  // Sincroniza dispositivos com o processo principal para a bandeja (array vazio)
  if (window.electronAPI && window.electronAPI.setDevices) {
    window.electronAPI.setDevices([]);
  }

  // Reseta o dispositivo atual
  currentDevice = null;
  if (window.electronAPI && window.electronAPI.setCurrentDevice) {
    window.electronAPI.setCurrentDevice(null);
  }
  hideControlSection();

  showSuccess("Dados de autenticação salvos");
}

function refreshDevices() {
  const savedAuth = localStorage.getItem("tuya_auth");
  if (savedAuth) {
    try {
      const authData = JSON.parse(savedAuth);

      // Restaura dados de autenticação
      accessToken = authData.access_token;
      refreshToken = authData.refresh_token;
      isOnline = true;
      baseUrl = authData.baseUrl;
      proxyUrl = authData.proxyUrl;

      // Atualiza token através do refresh token
      refreshAccessToken().then((success) => {
        if (success) {
          // Atualiza dispositivos
          getDeviceList().then((result) => {
            if (result.success) {
              devices = result.devices;
              populateDeviceList();
              saveDevicesData(devices);

              // Sincroniza dispositivos com o processo principal para a bandeja
              if (window.electronAPI && window.electronAPI.setDevices) {
                window.electronAPI.setDevices(devices);
              }

              // Restaura o dispositivo atual, se existir
              if (
                currentDevice &&
                !devices.find((d) => d.id === currentDevice.id)
              ) {
                currentDevice = null;
                if (window.electronAPI && window.electronAPI.setCurrentDevice) {
                  window.electronAPI.setCurrentDevice(null);
                }
                hideControlSection();
              }

              showSuccess("Dispositivos atualizados");
            } else {
              showError("Não foi possível atualizar os dispositivos");
            }
          });
        } else {
          showError("Não foi possível atualizar o token de autenticação");
        }
      });
    } catch (error) {
      console.error("Erro ao atualizar dispositivos:", error);
      showError("Erro ao atualizar dispositivos");
    }
  } else {
    showError("Não há dados de autenticação salvos");
  }
}

function showLoginError(message) {
  const errorDiv = document.getElementById("loginFailed");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";
}

function showLoading(show) {
  document.getElementById("loading").style.display = show ? "block" : "none";
}

function showError(message) {
  const errorDiv = document.getElementById("errorMessage");
  errorDiv.textContent = message;
  errorDiv.style.display = "block";

  setTimeout(() => {
    errorDiv.style.display = "none";
  }, 5000);
}

function showSuccess(message, autoHide = true) {
  const successDiv = document.getElementById("successMessage");
  successDiv.textContent = message;
  successDiv.style.display = "block";

  if (autoHide) {
    setTimeout(() => {
      successDiv.style.display = "none";
    }, 3000);
  }
}

// Utilitários para trabalhar com cores
function hslToHex(h, s, l) {
  h /= 360;
  s /= 100;
  l /= 100;

  const c = (1 - Math.abs(2 * l - 1)) * s;
  const x = c * (1 - Math.abs(((h * 6) % 2) - 1));
  const m = l - c / 2;
  let r = 0,
    g = 0,
    b = 0;

  if (0 <= h && h < 1 / 6) {
    r = c;
    g = x;
    b = 0;
  } else if (1 / 6 <= h && h < 2 / 6) {
    r = x;
    g = c;
    b = 0;
  } else if (2 / 6 <= h && h < 3 / 6) {
    r = 0;
    g = c;
    b = x;
  } else if (3 / 6 <= h && h < 4 / 6) {
    r = 0;
    g = x;
    b = c;
  } else if (4 / 6 <= h && h < 5 / 6) {
    r = x;
    g = 0;
    b = c;
  } else if (5 / 6 <= h && h <= 1) {
    r = c;
    g = 0;
    b = x;
  }

  const rHex = Math.round((r + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const gHex = Math.round((g + m) * 255)
    .toString(16)
    .padStart(2, "0");
  const bHex = Math.round((b + m) * 255)
    .toString(16)
    .padStart(2, "0");

  return `#${rHex}${gHex}${bHex}`;
}

function hexToHsl(hex) {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h,
    s,
    l = (max + min) / 2;

  if (max === min) {
    h = s = 0;
  } else {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return {
    h: Math.round(h * 360),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

// Funções para botões de ligar/desligar
function turnDeviceOn() {
  if (!currentDevice) {
    showError("Selecione um dispositivo");
    return;
  }

  if (isOnline) {
    controlDeviceOnline("turnOnOff", "value", 1);
  } else {
    controlDeviceOffline("turnOnOff", 1);
  }

  showSuccess(`Ligando "${currentDevice.name || currentDevice.id}"`);
}

function turnDeviceOff() {
  if (!currentDevice) {
    showError("Selecione um dispositivo");
    return;
  }

  if (isOnline) {
    controlDeviceOnline("turnOnOff", "value", 0);
  } else {
    controlDeviceOffline("turnOnOff", 0);
  }

  showSuccess(`Desligando "${currentDevice.name || currentDevice.id}"`);
}

// Função de reboot: desliga, espera e liga novamente
async function rebootDevice() {
  if (!currentDevice) {
    showError("Selecione um dispositivo");
    return;
  }

  const deviceType =
    currentDevice.dev_type || currentDevice.ha_type || "unknown";

  // Apenas para switches/tomadas
  if (deviceType !== "switch") {
    showError("Reboot disponível apenas para interruptores/tomadas");
    return;
  }

  const rebootDelay = 30000; // 30 segundos (pode ser configurável)
  const deviceName = currentDevice.name || currentDevice.id;
  let rebootMessageTimer = null;

  // Função para atualizar a mensagem com contagem regressiva
  const updateRebootMessage = (remainingSeconds) => {
    const successDiv = document.getElementById("successMessage");
    if (successDiv) {
      successDiv.textContent = `Reiniciando "${deviceName}"... Aguardando ${remainingSeconds} segundos antes de religar...`;
      successDiv.style.display = "block";
    }
  };

  // Desliga o dispositivo
  showSuccess(`Reiniciando "${deviceName}"... Desligando...`, false);

  try {
    // Envia comando de desligar
    if (isOnline) {
      await controlDeviceOnline("turnOnOff", "value", 0);
    } else {
      controlDeviceOffline("turnOnOff", 0);
    }

    // Mostra mensagem inicial de espera
    const initialMessage = `Aguardando ${
      rebootDelay / 1000
    } segundos antes de religar...`;
    showSuccess(`Reiniciando "${deviceName}"... ${initialMessage}`, false);

    // Atualiza a mensagem a cada segundo com contagem regressiva
    let remainingSeconds = rebootDelay / 1000;
    rebootMessageTimer = setInterval(() => {
      remainingSeconds--;
      if (remainingSeconds > 0) {
        updateRebootMessage(remainingSeconds);
      }
    }, 1000);

    await new Promise((resolve) => setTimeout(resolve, rebootDelay));

    // Limpa o timer de atualização da mensagem
    if (rebootMessageTimer) {
      clearInterval(rebootMessageTimer);
      rebootMessageTimer = null;
    }

    // Tenta ligar novamente
    // Nota: Se o dispositivo for o modem e perder conexão, o comando pode não chegar
    // Mas tentamos mesmo assim - alguns dispositivos mantêm o comando em fila
    showSuccess(`Religando "${deviceName}"...`, false);

    // Tenta múltiplas vezes caso a primeira falhe (útil se perdeu conexão temporariamente)
    let attempts = 0;
    const maxAttempts = 3;
    let success = false;

    while (attempts < maxAttempts && !success) {
      attempts++;

      try {
        if (isOnline) {
          const result = await controlDeviceOnline("turnOnOff", "value", 1);
          if (result && result.success) {
            success = true;
          }
        } else {
          controlDeviceOffline("turnOnOff", 1);
          success = true;
        }
      } catch (error) {
        console.error(`Tentativa ${attempts} falhou:`, error);
        if (attempts < maxAttempts) {
          // Aguarda um pouco antes de tentar novamente
          await new Promise((resolve) => setTimeout(resolve, 2000));
        }
      }
    }

    if (success) {
      showSuccess(`"${deviceName}" reiniciado com sucesso!`);
    } else {
      showError(
        `Não foi possível religar "${deviceName}" automaticamente. Tente ligar manualmente.`
      );
    }
  } catch (error) {
    // Limpa o timer em caso de erro
    if (rebootMessageTimer) {
      clearInterval(rebootMessageTimer);
      rebootMessageTimer = null;
    }
    console.error("Erro durante reboot:", error);
    showError(`Erro ao reiniciar "${deviceName}"`);
  }
}

// Torna as funções globalmente acessíveis
window.setBrightness = updateBrightness;
window.turnDeviceOn = turnDeviceOn;
window.turnDeviceOff = turnDeviceOff;
window.rebootDevice = rebootDevice;

// Funções de controle de janela
async function toggleAlwaysOnTop() {
  try {
    const isAlwaysOnTop = await window.electronAPI.toggleAlwaysOnTop();
    const icon = document.querySelector(".window-control i.fas.fa-thumbtack");
    if (icon) {
      icon.className = isAlwaysOnTop ? "fas fa-thumbtack" : "fas fa-thumbtack";
      icon.style.color = isAlwaysOnTop ? "var(--primary)" : "var(--gray)";
    }
  } catch (error) {
    console.error("Erro ao alternar modo de fixação da janela:", error);
  }
}

async function minimizeWidget() {
  try {
    await window.electronAPI.minimizeWidget();
  } catch (error) {
    console.error("Erro ao minimizar janela:", error);
  }
}

async function closeWidget() {
  try {
    // Fecha o aplicativo imediatamente sem confirmação
    await window.electronAPI.quitApp();
  } catch (error) {
    console.error("Erro ao fechar aplicativo:", error);
    showError("Erro ao fechar aplicativo");
  }
}

// Torna as funções de controle de janela globalmente acessíveis
window.toggleAlwaysOnTop = toggleAlwaysOnTop;
window.minimizeWidget = minimizeWidget;
window.closeWidget = closeWidget;
