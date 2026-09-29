(() => {
  "use strict";
  const STORAGE_KEY="umar-messenger-v3";
  const palette=["orange","blue","green","purple"];
  const initialChats=[
    {id:"ali",name:"Али",color:"orange",status:"в сети",unread:2,updated:"20:14",messages:[
      {mine:false,text:"Привет! 👋",time:"20:12"},{mine:false,text:"Как дела?",time:"20:13"},{mine:true,text:"Всё хорошо. Увидимся завтра!",time:"20:14",status:"✓✓"}]},
    {id:"muhammad",name:"Мухаммад",color:"blue",status:"был недавно",unread:0,updated:"19:48",messages:[{mine:false,text:"Отправил тебе файл",time:"19:48"}]},
      ];
  const $=s=>document.querySelector(s), $$=s=>[...document.querySelectorAll(s)];
  const chatList=$("#chatList"),messages=$("#messages"),searchInput=$("#searchInput"),messageInput=$("#messageInput"),conversation=$("#conversation"),detailsPanel=$("#detailsPanel"),settingsDrawer=$("#settingsDrawer"),emojiPicker=$("#emojiPicker"),emojiGrid=$("#emojiGrid"),deleteDialog=$("#deleteDialog"),deleteForBoth=$("#deleteForBoth");
  let state=loadState();
  let deferredInstallPrompt=null;
  function loadState(){try{const saved=JSON.parse(localStorage.getItem(STORAGE_KEY));if(saved?.chats?.length)return saved}catch{}return{chats:structuredClone(initialChats),selected:"ali",filter:"all",theme:"dark"}}
  function saveState(){localStorage.setItem(STORAGE_KEY,JSON.stringify(state))}
  window.addEventListener("beforeinstallprompt",event=>{event.preventDefault();deferredInstallPrompt=event;const b=$("#downloadAppButton");if(b){b.querySelector("strong").textContent="Установить приложение";b.querySelector("small").textContent="Добавить Umar на устройство"}});
  window.addEventListener("appinstalled",()=>{deferredInstallPrompt=null});
  function installApp(){if(deferredInstallPrompt){deferredInstallPrompt.prompt();deferredInstallPrompt.userChoice.then(()=>{deferredInstallPrompt=null}).catch(()=>{});return}openSettingsModal("Установка Umar","Добавьте сайт как приложение",'<div class="about-app"><div class="about-logo">U</div><strong>Umar Messenger</strong><p>В Chrome откройте меню браузера и выберите «Установить Umar Messenger».</p></div>')}
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
    $("#backButton").addEventListener("click",()=>conversation.classList.remove("is-open"));
  $("#infoButton").addEventListener("click",()=>detailsPanel.classList.toggle("is-open"));
  function openDeleteDialog(){const chat=selectedChat();if(!chat)return;$("#deleteName").textContent=chat.name;$("#deleteUsername").textContent="@"+chat.id.replace(/^chat-/,"");$("#deleteAvatar").textContent=initials(chat.name);$("#deleteAvatar").className="delete-avatar avatar "+chat.color;deleteForBoth.checked=false;deleteDialog.hidden=false;detailsPanel.classList.remove("is-open")}
  function closeDeleteDialog(){deleteDialog.hidden=true}
  function deleteContact(){const id=state.selected;state.chats=state.chats.filter(c=>c.id!==id);state.selected=state.chats[0]?.id||null;saveState();closeDeleteDialog();renderChats();if(state.selected){renderConversation(true)}else{messages.innerHTML="";$("#headerName").textContent="Выберите чат";$("#headerStatus").textContent="";$("#headerAvatar").textContent="";}conversation.classList.remove("is-open");}
  $("#deleteContactButton").addEventListener("click",openDeleteDialog);$("#cancelDelete").addEventListener("click",closeDeleteDialog);$("#confirmDelete").addEventListener("click",deleteContact);
  $("#chatSearchButton").addEventListener("click",()=>searchInput.focus());
  searchInput.addEventListener("input",renderChats);
  $$(".filter").forEach(button=>button.addEventListener("click",()=>{$$(".filter").forEach(x=>x.classList.remove("is-active"));button.classList.add("is-active");state.filter=button.dataset.filter;saveState();renderChats()}));
  $("#themeButton")?.addEventListener("click",()=>{state.theme=state.theme==="dark"?"light":"dark";document.documentElement.dataset.theme=state.theme;saveState()});
    function openSettings(){if(!settingsDrawer)return;settingsDrawer.hidden=false;requestAnimationFrame(()=>settingsDrawer.classList.add("is-open"))}
  function closeSettings(){if(!settingsDrawer)return;settingsDrawer.classList.remove("is-open");setTimeout(()=>settingsDrawer.hidden=true,220)}
  $("#profileButton")?.addEventListener("click",openSettings);
  $("#closeSettings")?.addEventListener("click",closeSettings);
  settingsDrawer?.addEventListener("click",e=>{if(e.target===settingsDrawer)closeSettings()});
  const settingsModal=$("#settingsModal"),settingsModalBody=$("#settingsModalBody");
  function openSettingsModal(title,subtitle,body){$("#settingsModalTitle").textContent=title;$("#settingsModalSubtitle").textContent=subtitle;settingsModalBody.innerHTML=body;settingsModal.hidden=false}
  function closeSettingsModal(){settingsModal.hidden=true}
  $("#closeSettingsModal")?.addEventListener("click",closeSettingsModal);
  settingsModal?.addEventListener("click",e=>{if(e.target===settingsModal)closeSettingsModal()});
  function syncSettings(){const n=$("#notificationState"),d=$("#dataState"),a=$("#appearanceButton small"),p=$("#privacyButton small");if(n)n.textContent=state.notifications!==false?"Включены":"Выключены";if(d)d.textContent=(state.chats?.length||0)+" чата(ов) на этом устройстве";if(a)a.textContent=state.theme==="light"?"Светлая тема":"Тёмная тема";if(p)p.textContent=state.lastSeen===false?"Скрыт":"Последний визит виден"}
  $("#notificationsSettingsButton")?.addEventListener("click",()=>{openSettingsModal("Уведомления","Управление уведомлениями",'<div class="setting-control"><div><strong>Уведомления</strong><small>Включать уведомления о новых сообщениях</small></div><button class="toggle-button" id="modalNotifications" type="button"><span></span></button></div>');$("#modalNotifications").classList.toggle("is-on",state.notifications!==false);$("#modalNotifications").onclick=()=>{state.notifications=state.notifications===false;saveState();syncSettings();closeSettingsModal()}});
  $("#notificationsButton")?.addEventListener("click",()=>$("#notificationsSettingsButton").click());
  $("#detailsSearchButton")?.addEventListener("click",()=>searchInput.focus());
  $("#editProfileButton")?.addEventListener("click",()=>{openSettingsModal("Профиль","Ваше имя и статус",'<label class="modal-label" for="profileName">Имя</label><input class="modal-input" id="profileName" maxlength="32"><label class="modal-label" for="profileStatus">Статус</label><input class="modal-input" id="profileStatus" maxlength="60"><div class="modal-actions"><button class="secondary-button" id="profileCancel" type="button">Отмена</button><button class="primary-button" id="profileSave" type="button">Сохранить</button></div>');$("#profileName").value=state.profile?.name||"Umar";$("#profileStatus").value=state.profile?.status||"в сети";$("#profileCancel").onclick=closeSettingsModal;$("#profileSave").onclick=()=>{state.profile={name:$("#profileName").value.trim()||"Umar",status:$("#profileStatus").value.trim()||"в сети"};saveState();$(".settings-profile strong").textContent=state.profile.name;$(".settings-profile span").textContent=state.profile.status;closeSettingsModal()}});
  $("#appearanceButton")?.addEventListener("click",()=>{openSettingsModal("Оформление","Выберите тему",'<div class="theme-options"><button class="theme-option" id="darkTheme" type="button"><b>Тёмная</b><small>LOWPOLY dark</small></button><button class="theme-option" id="lightTheme" type="button"><b>Светлая</b><small>Светлая поверхность</small></button></div>');$("#"+(state.theme==="light"?"lightTheme":"darkTheme")).classList.add("is-active");$("#darkTheme").onclick=()=>{state.theme="dark";document.documentElement.dataset.theme="dark";saveState();syncSettings();closeSettingsModal()};$("#lightTheme").onclick=()=>{state.theme="light";document.documentElement.dataset.theme="light";saveState();syncSettings();closeSettingsModal()}});
  $("#privacyButton")?.addEventListener("click",()=>{openSettingsModal("Конфиденциальность","Кто видит вашу активность",'<div class="setting-control"><div><strong>Последний визит</strong><small>Показывать время последнего посещения</small></div><button class="toggle-button" id="lastSeenToggle" type="button"><span></span></button></div><div class="setting-control"><div><strong>Статус прочтения</strong><small>Показывать отметки о прочтении сообщений</small></div><button class="toggle-button" id="readReceiptsToggle" type="button"><span></span></button></div>');$("#lastSeenToggle").classList.toggle("is-on",state.lastSeen!==false);$("#readReceiptsToggle").classList.toggle("is-on",state.readReceipts!==false);$("#lastSeenToggle").onclick=()=>{state.lastSeen=state.lastSeen===false;saveState();$("#lastSeenToggle").classList.toggle("is-on",state.lastSeen)};$("#readReceiptsToggle").onclick=()=>{state.readReceipts=state.readReceipts===false;saveState();$("#readReceiptsToggle").classList.toggle("is-on",state.readReceipts)}});
  $("#dataButton")?.addEventListener("click",()=>{openSettingsModal("Данные и хранилище","Управление данными на этом устройстве",'<div class="data-card"><strong id="localChatCount"></strong><span>чатов сохранено локально</span></div><p class="settings-note">Демонстрационные сообщения хранятся только в браузере этого устройства.</p><button class="danger-button data-clear" id="clearDataButton" type="button">Очистить локальные данные</button>');$("#localChatCount").textContent=state.chats.length;$("#clearDataButton").onclick=()=>{if(confirm("Удалить все локальные чаты и настройки?")){localStorage.removeItem(STORAGE_KEY);location.reload()}}});
  $("#downloadAppButton")?.addEventListener("click",installApp);
  $("#aboutButton")?.addEventListener("click",()=>openSettingsModal("О приложении","Umar Messenger",'<div class="about-app"><div class="about-logo">U</div><strong>Umar Messenger</strong><span>LOWPOLY • версия 1.0</span><p>Веб-мессенджер с локальным хранением чатов, эмодзи и настройками интерфейса.</p></div>'));
  const emojiList="😀 😃 😄 😁 😆 😅 😂 🙂 🙃 😉 😊 😎 😍 🥰 😘 🤗 🤔 😐 😑 😶 🙄 😏 😣 😥 😮 🤐 😯 😪 😫 😴 😌 🤓 🥳 😇 😭 😢 😤 😡 🤬 😱 😳 🤩 😋 😛 😜 🤪 🫡 ❤️ 🧡 💛 💚 💙 💜 🖤 🤍 💔 👍 👎 👌 ✌️ 🤝 🙏 👏 🎉 🔥 ⭐ 💯 🚀 ⚡ 🌙 ☀️ ☕ 🍕 🍔 ⚽ 🎮".split(" ");
  emojiGrid.innerHTML=emojiList.map(e=>'<button type="button" class="emoji-item">'+e+'</button>').join("");
  $("#emojiButton").addEventListener("click",()=>{emojiPicker.hidden=!emojiPicker.hidden;if(!emojiPicker.hidden)messageInput.focus()});
  $("#closeEmoji").addEventListener("click",()=>emojiPicker.hidden=true);
  emojiGrid.addEventListener("click",e=>{if(e.target.matches(".emoji-item")){messageInput.value+=e.target.textContent;messageInput.focus()}});
  document.addEventListener("keydown",e=>{if((e.ctrlKey||e.metaKey)&&e.key.toLowerCase()==="k"){e.preventDefault();searchInput.focus()}if(e.key==="Escape")emojiPicker.hidden=true});
  state.notifications=state.notifications!==false;
  state.profile=state.profile||{name:"Umar",status:"в сети"};state.lastSeen=state.lastSeen!==false;state.readReceipts=state.readReceipts!==false;
  document.documentElement.dataset.theme=state.theme||"dark";$(".settings-profile strong").textContent=state.profile.name;$(".settings-profile span").textContent=state.profile.status;syncSettings();
  if(state.filter!=="all")$$(".filter").forEach(x=>x.classList.toggle("is-active",x.dataset.filter===state.filter));
  renderChats();renderConversation();
})();