(function () {
  // true  -> simulacion de escritura, un mensaje a la vez
  // false -> todos los mensajes de una
  // Se puede forzar desde la URL con ?typing=1 o ?typing=0
  var typing = false;

  var messagesEl = document.querySelector(".messages");
  var messagesUrl = "data/messages.json";
  var typingSpeed = 20;
  var imageTypingDuration = 900;
  var loadingText = "<b>•</b><b>•</b><b>•</b>";
  var messages = [];
  var messageIndex = 0;

  var isTypingEnabled = function () {
    var param = /[?&]typing=(0|1|true|false)/i.exec(location.search);
    if (param) return param[1] === "1" || param[1].toLowerCase() === "true";
    if (window.matchMedia && matchMedia("(prefers-reduced-motion: reduce)").matches)
      return false;
    return typing;
  };

  var getCurrentTime = function () {
    var date = new Date();
    var current = date.getHours() + date.getMinutes() * 0.01;
    if (current >= 5 && current < 19) return "Have a nice day!";
    if (current >= 19 && current < 22) return "Have a nice evening!";
    return "Have a good night!";
  };

  var tokens = {
    greeting: getCurrentTime,
  };

  var resolveTokens = function (text) {
    return text.replace(/{{\s*(\w+)\s*}}/g, function (match, key) {
      return typeof tokens[key] === "function" ? tokens[key]() : match;
    });
  };

  var stripTags = function (text) {
    return text.replace(/<(?:.|\n)*?>/gm, "");
  };

  var isImage = function (message) {
    return message.type === "image";
  };

  var resolveMessage = function (message) {
    if (isImage(message)) return message;
    return {
      type: "text",
      text: resolveTokens(message.text),
    };
  };

  var getTypingDuration = function (message) {
    if (isImage(message)) return imageTypingDuration;
    return stripTags(message.text).length * typingSpeed + 500;
  };

  var pxToRem = function (px) {
    return px / parseInt(getComputedStyle(document.body).fontSize) + "rem";
  };

  var createBubbleElements = function (message) {
    var bubbleEl = document.createElement("div");
    var messageEl = document.createElement("span");
    var loadingEl = document.createElement("span");
    bubbleEl.className =
      "bubble is-loading cornered left " + (isImage(message) ? "image" : "text");
    messageEl.className = "message";
    loadingEl.className = "loading";
    if (isImage(message)) {
      var imageEl = document.createElement("img");
      imageEl.src = message.src;
      imageEl.alt = message.alt || "";
      messageEl.appendChild(imageEl);
    } else {
      messageEl.innerHTML = message.text;
    }
    loadingEl.innerHTML = loadingText;
    bubbleEl.appendChild(loadingEl);
    bubbleEl.appendChild(messageEl);
    bubbleEl.style.opacity = 0;
    return {
      bubble: bubbleEl,
      message: messageEl,
      loading: loadingEl,
    };
  };

  var getDimentions = function (elements) {
    return {
      loading: {
        w: "4rem",
        h: "2.25rem",
      },
      bubble: {
        w: pxToRem(elements.bubble.offsetWidth + 4),
        h: pxToRem(elements.bubble.offsetHeight),
      },
      message: {
        w: pxToRem(elements.message.offsetWidth + 4),
        h: pxToRem(elements.message.offsetHeight),
      },
    };
  };

  var sendMessage = function (message) {
    var loadingDuration = getTypingDuration(message);
    var elements = createBubbleElements(message);
    messagesEl.appendChild(elements.bubble);
    messagesEl.appendChild(document.createElement("br"));
    var dimensions = getDimentions(elements);
    elements.bubble.style.width = "0rem";
    elements.bubble.style.height = dimensions.loading.h;
    elements.message.style.width = dimensions.message.w;
    elements.message.style.height = dimensions.message.h;
    elements.bubble.style.opacity = 1;
    var bubbleOffset = elements.bubble.offsetTop + elements.bubble.offsetHeight;
    if (bubbleOffset > messagesEl.offsetHeight) {
      anime({
        targets: messagesEl,
        scrollTop: bubbleOffset,
        duration: 750,
      });
    }
    var bubbleSize = anime({
      targets: elements.bubble,
      width: ["0rem", dimensions.loading.w],
      marginTop: ["2.5rem", 0],
      marginLeft: ["-2.5rem", 0],
      duration: 800,
      easing: "easeOutElastic",
    });
    var loadingLoop = anime({
      targets: elements.bubble,
      scale: [1.05, 0.95],
      duration: 1100,
      loop: true,
      direction: "alternate",
      easing: "easeInOutQuad",
    });
    anime({
      targets: elements.loading,
      translateX: ["-2rem", "0rem"],
      scale: [0.5, 1],
      duration: 400,
      delay: 25,
      easing: "easeOutElastic",
    });
    var dotsPulse = anime({
      targets: elements.bubble.querySelectorAll("b"),
      scale: [1, 1.25],
      opacity: [0.5, 1],
      duration: 300,
      loop: true,
      direction: "alternate",
      delay: function (i) {
        return i * 100 + 50;
      },
    });
    setTimeout(function () {
      loadingLoop.pause();
      dotsPulse.restart({
        opacity: 0,
        scale: 0,
        loop: false,
        direction: "forwards",
        update: function (a) {
          if (
            a.progress >= 65 &&
            elements.bubble.classList.contains("is-loading")
          ) {
            elements.bubble.classList.remove("is-loading");
            anime({
              targets: elements.message,
              opacity: [0, 1],
              duration: 300,
            });
          }
        },
      });
      bubbleSize.restart({
        scale: 1,
        width: [dimensions.loading.w, dimensions.bubble.w],
        height: [dimensions.loading.h, dimensions.bubble.h],
        marginTop: 0,
        marginLeft: 0,
        begin: function () {
          if (messageIndex < messages.length)
            elements.bubble.classList.remove("cornered");
        },
      });
    }, loadingDuration - 50);
  };

  var sendMessages = function () {
    var message = messages[messageIndex];
    if (!message) return;
    var resolved = resolveMessage(message);
    sendMessage(resolved);
    ++messageIndex;
    setTimeout(
      sendMessages,
      getTypingDuration(resolved) - 500 + anime.random(900, 1200)
    );
  };

  var showAllMessages = function () {
    var last = messages.length - 1;
    messages.forEach(function (message, index) {
      var elements = createBubbleElements(resolveMessage(message));
      elements.bubble.classList.remove("is-loading");
      if (index < last) elements.bubble.classList.remove("cornered");
      elements.bubble.style.opacity = 1;
      elements.message.style.opacity = 1;
      elements.bubble.removeChild(elements.loading);
      messagesEl.appendChild(elements.bubble);
      messagesEl.appendChild(document.createElement("br"));
    });
    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  var preloadImages = function (list, done) {
    var images = list.filter(isImage);
    var remaining = images.length;
    if (!remaining) return done();
    var onSettled = function () {
      if (--remaining === 0) done();
    };
    images.forEach(function (message) {
      var imageEl = new Image();
      imageEl.onload = onSettled;
      imageEl.onerror = onSettled;
      imageEl.src = message.src;
    });
  };

  fetch(messagesUrl)
    .then(function (response) {
      return response.json();
    })
    .then(function (data) {
      messages = data;
      if (!isTypingEnabled()) return showAllMessages();
      preloadImages(messages, sendMessages);
    })
    .catch(function (error) {
      console.error("Could not load " + messagesUrl, error);
    });
})();
