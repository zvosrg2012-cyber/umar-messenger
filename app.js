(() => {
  "use strict";
  const STORAGE_KEY="umar-messenger-v3";
  const palette=["orange","blue","green","purple"];
  const initialChats=[
    {id:"ali",name:"Али",color:"orange",status:"в сети",unread:2,updated:"20:14",messages:[
      {mine:false,text:"Привет! 👋",time:"20:12"},{mine:false,text:"Как дела?",time:"20:13"},{mine:true,text:"Всё хорошо. Увидимся завтра!",time:"20:14",status:"✓✓"}]},
    {id:"muhammad",name:"Мухаммад",color:"blue",status:"был недавно",unread:0,updated:"19:48",messages:[{mine:false,text:"Отправил тебе файл",time:"19:48"}]},
    {id:"family",name:"Семья",color:"green",status:"4 участника",unread:4,updated:"18:32",messages:[{mine:false,text:"Папа: Буду через 20 минут",time:"18:32"}]},
    {id:"team",name:"Umar Team",color:"purple",status:"5 участников",unread:0,updated:"17:05",messages:[{mine:false,text:"Добро пожаловать в Umar Messenger",time:"17:05"}]}
  ];
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const chatList=$("#chatList"),messages=$("#messages"),searchInput=$("#searchInput"),messageInput=$("#messageInput"),conversation=$("#conversation"),detailsPanel=$("#detailsPanel"),modalBackdrop=$("#modalBackdrop"),newChatName=$("#newChatName"),settingsDrawer=$("#settingsDrawer");
  let state=loadState();
  function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.chats?.length)return saved}catch{}return{chats:structuredClone(initialChats),selected:"ali",filter:"all",theme:"dark"}}
  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  function selectedChat(){return state.chats.find(c=>c.id===state.selected)||state.chats[0]}
  function initials(name){return name.trim().split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase()||"U"}
  function escapeHTML(value){return String(value).replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"}[ch]))}

  function renderChats(){
    const query=searchInput.value.trim().toLowerCase();
    chatList.innerHTML="";
    state.chats.filter(c=>state.filter==="all"||c.unread>0).filter(c=>c.name.toLowerCase().includes(query)).forEach(chat=>{
      const item=document.createElement("article");
      item.className="chat"+(chat.id===state.selected?" is-active":"");
      item.dataset.chatId=chat.id;item.tabIndex=0;item.setAttribute("role","listitem");
      item.innerHTML=`<div class="avatar ${chat.color}">${escapeHTML(initials(chat.name))}</div><div class="chat-copy"><div class="chat-top"><strong>${escapeHTML(chat.name)}</strong><time>${escapeHTML(chat.updated)}</time></div><div class="chat-bottom"><span class="chat-preview">${escapeHTML(chat.messages.at(-1)?.text||"Новый чат")}</span>${chat.unread?`<span class="unread">${chat.unread}</span>`:""}</div></div>`;
      chatList.appendChild(item);
    });
  }

  function renderConversation(animate=false){
    const chat=selectedChat();if(!chat)return;
    $("#headerName").textContent=chat.name;$("#headerStatus").textContent=chat.status;$("#headerAvatar").textContent=initials(chat.name);$("#headerAvatar").className="avatar "+chat.color;
    $("#detailsName").textContent=chat.name;$("#detailsStatus").textContent=chat.status;$("#detailsAvatar").textContent=initials(chat.name);$("#detailsAvatar").className="details-avatar avatar "+chat.color;
    messages.innerHTML='<div class="day">Сегодня</div>';
    chat.messages.forEach(m=>{const row=document.createElement("div");row.className="message"+(m.mine?" mine":"");row.innerHTML=`<div class="bubble">${escapeHTML(m.text)}<span class="message-meta">${escapeHTML(m.time)} ${m.mine?escapeHTML(m.status||"✓"):""}</span></div>`;messages.appendChild(row)});
    if(animate){conversation.classList.remove("chat-switch");void conversation.offsetWidth;conversation.classList.add("chat-switch")}
    requestAnimationFrame(()=>messages.scrollTop=messages.scrollHeight);
  }

  function selectChat(id){
    if(!state.chats.some(c=>c.id===id)||state.selected===id)return;
    state.selected=id;const chat=selectedChat();chat.unread=0;saveState();
    renderChats();renderConversation(true);conversation.classList.add("is-open");
    if(window.innerWidth<=760)messageInput.focus({preventScroll:true});
  }

  chatList.addEventListener("click",e=>{const item=e.target.closest(".chat[data-chat-id]");if(item)selectChat(item.dataset.chatId)});
  chatList.addEventListener("keydown",e=>{const item=e.target.closest(".chat[data-chat-id]");if(item&&(e.key==="Enter"||e.key===" ")){e.preventDefault();selectChat(item.dataset.chatId)}});
  function sendMessage(value){value=value.trim();if(!value)return;const chat=selectedChat(),time=new Date().toLocaleTimeString("ru-RU",{hour:"2-digit",minute:"2-digit"});chat.messages.push({mine:true,text:value,time,status:"✓"});chat.updated=time;saveState();renderChats();renderConversation(true);messageInput.value="";messageInput.focus()}
  function openModal(){modalBackdrop.hidden=false;newChatName.value="";requestAnimationFrame(()=>newChatName.focus())}
  function closeModal(){modalBackdrop.hidden=true}
  function createChat(){const name=newChatName.value.trim();if(!name)return;const id="chat-"+Date.now();state.chats.unshift({id,name,color:palette[state.chats.length%palette.length],status:"новый чат",unread:0,updated:"сейчас",messages:[]});state.selected=id;saveState();closeModal();renderChats();renderConversation(true);conversation.classList.add("is-open")}
  $("#composer").addEventListener("submit",e=>{e.preventDefault();sendMessage(messageInput.value)});
  $("#newChatButton").addEventListener("click",openModal);$("#createChat").addEventListener("click",createChat);$("#cancelModal").addEventListener("click",closeModal);$("#closeModal").addEventListener("click",closeModal);
  modalBackdrop.addEventListener("click",e=>{if(e.target===modalBackdrop)closeModal()});newChatName.addEventListener("keydown",e=>{if(e.key==="Enter")createChat()});
  $("#backButton").addEventListener("click",()=>conversation.classList.remove("is-open"));
  $("#infoButton").addEventListener("click",()=>detailsPanel.classList.toggle("is-open"));
  $("#chatSearchButton").addEventListener("click",()=>searchInput.focus());
  searchInput.addEventListener("input",renderChats);
  $$(".filter").forEach(button=>button.addEventListener("click",()=>{$$(".filter").forEach(x=>x.classList.remove("is-active"));button.classList.add("is-active");state.filter=button.dataset.filter;saveState();renderChats()}));
  $("#themeButton")?.addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=state.theme;saveState()});
  $("#emojiButton").addEventListener("click",()=>{messageInput.value+=" 🙂";messageInput.focus()});
  $("#attachButton").addEventListener("click",()=>{messageInput.placeholder="Вложения подключаются через серверный API";setTimeout(()=>messageInput.placeholder="Написать сообщение...",1800)});
  $("#profileButton").addEventListener("click",()=>alert("Меню Umar Messenger"));
  settingsDrawer.addEventListener("click",e=>{if(e.target===settingsDrawer)closeSettings()});
  const settingsDrawer=$("#settingsDrawer");
  function openSettings(){if(!settingsDrawer)return;settingsDrawer.hidden=false;requestAnimationFrame(()=>settingsDrawer.classList.add("is-open"))}
  function closeSettings(){if(!settingsDrawer)return;settingsDrawer.classList.remove("is-open");setTimeout(()=>settingsDrawer.hidden=true,220)}
  $("#profileButton")?.addEventListener("click",openSettings);
  $("#closeSettings")?.addEventListener("click",closeSettings);
  settingsDrawer?.addEventListener("click",e=>{if(e.target===settingsDrawer)closeSettings()});
  $("#notificationsSettingsButton")?.addEventListener("click",()=>{
    state.notifications=state.notifications===false;
    saveState();
    const el=$("#notificationState"); if(el) el.textContent=state.notifications?"Включены":"Выключены";
  });
  $("#notificationsButton")?.addEventListener("click",()=>{
    state.notifications=state.notifications===false;
    saveState();
  });
  $("#detailsSearchButton")?.addEventListener("click",()=>searchInput.focus());
  $("#editProfileButton")?.addEventListener("click",()=>alert("Профиль подключим к серверному аккаунту."));
  $("#appearanceButton")?.addEventListener("click",()=>alert("Оформление: тёмная тема. Переключатель темы подключим к серверным настройкам."));
  $("#privacyButton")?.addEventListener("click",()=>alert("Конфиденциальность подключим к серверной авторизации."));
  $("#dataButton")?.addEventListener("click",()=>alert("Данные и хранилище будут подключены к серверному API."));
  $("#aboutButton")?.addEventListener("click",()=>alert("Umar Messenger — LOWPOLY messenger."));
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();searchInput.focus()}if(e.key==="Escape"&&!modalBackdrop.hidden)closeModal()});
  state.notifications=state.notifications!==false;
  state.notifications=state.notifications!==false;
  document.documentElement.dataset.theme=state.theme;
  if(state.filter!=="all")$$(".filter").forEach(x=>x.classList.toggle("is-active",x.dataset.filter===state.filter));
  renderChats();renderConversation();
})();