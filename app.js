(() => {
  "use strict";

  const STORAGE_KEY = "umar-messenger-v2";
  const palette = ["orange", "blue", "green", "purple"];

  const initialChats = [
    {id:"ali",name:"Али",color:"orange",status:"в сети",unread:2,updated:"20:14",messages:[
      {mine:false,text:"Привет! 👋",time:"20:12"},
      {mine:false,text:"Как дела?",time:"20:13"},
      {mine:true,text:"Всё хорошо. Увидимся завтра!",time:"20:14",status:"✓✓"}
    ]},
    {id:"muhammad",name:"Мухаммад",color:"blue",status:"был недавно",unread:0,updated:"19:48",messages:[
      {mine:false,text:"Отправил тебе файл",time:"19:48"}
    ]},
    {id:"family",name:"Семья",color:"green",status:"4 участника",unread:4,updated:"18:32",messages:[
      {mine:false,text:"Папа: Буду через 20 минут",time:"18:32"}
    ]},
    {id:"team",name:"Umar Team",color:"purple",status:"5 участников",unread:0,updated:"17:05",messages:[
      {mine:false,text:"Добро пожаловать в Umar Messenger",time:"17:05"}
    ]}
  ];

  const state = loadState();
  const $ = (s) => document.querySelector(s);
  const $$ = (s) => [...document.querySelectorAll(s)];

  const chatList = $("#chatList");
  const messages = $("#messages");
  const searchInput = $("#searchInput");
  const messageInput = $("#messageInput");
  const conversation = $("#conversation");
  const detailsPanel = $("#detailsPanel");
  const modalBackdrop = $("#modalBackdrop");
  const newChatName = $("#newChatName");

  function loadState() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      if (saved && Array.isArray(saved.chats) && saved.chats.length) return saved;
    } catch {}
    return {chats: initialChats, selected:"ali", filter:"all", theme:"dark"};
  }

  function saveState() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }

  function getSelectedChat() {
    return state.chats.find(c => c.id === state.selected) || state.chats[0];
  }

  function initials(name) {
    return name.trim().split(/\s+/).map(x => x[0]).slice(0,2).join("").toUpperCase() || "U";
  }

  function escapeHTML(value) {
    return value.replace(/[&<>"']/g, ch => ({ "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;" }[ch]));
  }

  function renderChats() {
    const query = searchInput.value.trim().toLowerCase();
    chatList.innerHTML = "";

    state.chats
      .filter(chat => state.filter === "all" || chat.unread > 0)
      .filter(chat => chat.name.toLowerCase().includes(query))
      .forEach(chat => {
        const item = document.createElement("article");
        item.className = "chat" + (chat.id === state.selected ? " is-active" : "");
        item.tabIndex = 0;
        item.setAttribute("role","listitem");
        item.innerHTML = `
          <div class="avatar ${chat.color}" aria-hidden="true">${escapeHTML(initials(chat.name))}</div>
          <div class="chat-copy">
            <div class="chat-top"><strong>${escapeHTML(chat.name)}</strong><time>${escapeHTML(chat.updated)}</time></div>
            <div class="chat-bottom">
              <span class="chat-preview">${escapeHTML(chat.messages.at(-1)?.text || "Новый чат")}</span>
              ${chat.unread ? `<span class="unread" aria-label="${chat.unread} непрочитанных">${chat.unread}</span>` : ""}
            </div>
          </div>`;
        item.addEventListener("click", () => selectChat(chat.id));
        item.addEventListener("keydown", e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); selectChat(chat.id); }});
        chatList.appendChild(item);
      });
  }

  function renderConversation() {
    const chat = getSelectedChat();
    if (!chat) return;

    $("#headerName").textContent = chat.name;
    $("#headerStatus").textContent = chat.status;
    $("#headerAvatar").textContent = initials(chat.name);
    $("#headerAvatar").className = "avatar " + chat.color;
    $("#detailsName").textContent = chat.name;
    $("#detailsStatus").textContent = chat.status;
    $("#detailsAvatar").textContent = initials(chat.name);
    $("#detailsAvatar").className = "details-avatar avatar " + chat.color;

    messages.innerHTML = '<div class="day">Сегодня</div>';
    chat.messages.forEach(message => {
      const row = document.createElement("div");
      row.className = "message" + (message.mine ? " mine" : "");
      row.innerHTML = `<div class="bubble">${escapeHTML(message.text)}<span class="message-meta">${escapeHTML(message.time)} ${message.mine ? escapeHTML(message.status || "✓") : ""}</span></div>`;
      messages.appendChild(row);
    });
    requestAnimationFrame(() => { messages.scrollTop = messages.scrollHeight; });
  }

  function selectChat(id) {
    state.selected = id;
    const chat = getSelectedChat();
    if (chat) chat.unread = 0;
    saveState();
    renderChats();
    renderConversation();
    conversation.classList.add("is-open");
  }

  function sendMessage(text) {
    const value = text.trim();
    if (!value) return;
    const chat = getSelectedChat();
    if (!chat) return;
    const now = new Date();
    const time = now.toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});
    chat.messages.push({mine:true,text:value,time,status:"✓"});
    chat.updated = time;
    saveState();
    renderChats();
    renderConversation();
    messageInput.value = "";
    messageInput.focus();
  }

  function openModal() {
    modalBackdrop.hidden = false;
    newChatName.value = "";
    requestAnimationFrame(() => newChatName.focus());
  }

  function closeModal() {
    modalBackdrop.hidden = true;
  }

  function createChat() {
    const name = newChatName.value.trim();
    if (!name) return;
    const id = "chat-" + Date.now();
    state.chats.unshift({
      id,name,color:palette[state.chats.length % palette.length],
      status:"новый чат",unread:0,updated:"сейчас",
      messages:[]
    });
    state.selected = id;
    saveState();
    closeModal();
    renderChats();
    renderConversation();
    conversation.classList.add("is-open");
  }

  $("#composer").addEventListener("submit", e => { e.preventDefault(); sendMessage(messageInput.value); });
  $("#newChatButton").addEventListener("click", openModal);
  $("#createChat").addEventListener("click", createChat);
  $("#cancelModal").addEventListener("click", closeModal);
  $("#closeModal").addEventListener("click", closeModal);
  modalBackdrop.addEventListener("click", e => { if (e.target === modalBackdrop) closeModal(); });

  $("#backButton").addEventListener("click", () => conversation.classList.remove("is-open"));
  $("#infoButton").addEventListener("click", () => detailsPanel.classList.toggle("is-open"));

  searchInput.addEventListener("input", renderChats);
  $$(".filter").forEach(button => button.addEventListener("click", () => {
    $$(".filter").forEach(x => x.classList.remove("is-active"));
    button.classList.add("is-active");
    state.filter = button.dataset.filter;
    saveState();
    renderChats();
  }));

  $("#themeButton").addEventListener("click", () => {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = state.theme;
    saveState();
  });

  $("#emojiButton").addEventListener("click", () => {
    messageInput.value += " 🙂";
    messageInput.focus();
  });

  $("#attachButton").addEventListener("click", () => {
    messageInput.placeholder = "Вложения подключаются через серверный API";
    setTimeout(() => messageInput.placeholder = "Написать сообщение...", 1800);
  });

  $("#chatSearchButton").addEventListener("click", () => searchInput.focus());

  $("#profileButton").addEventListener("click", () => {
    alert("Профиль пользователя Umar");
  });

  document.addEventListener("keydown", e => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      searchInput.focus();
    }
    if (e.key === "Escape" && !modalBackdrop.hidden) closeModal();
  });

  document.documentElement.dataset.theme = state.theme;
  renderChats();
  renderConversation();
})();