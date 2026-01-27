document.addEventListener("DOMContentLoaded", () => {
  // quizData is now loaded from quiz_data.js
  // const quizData = [...]; 



  /* --- Random Mode & Initialization Logic --- */
  const urlParams = new URLSearchParams(window.location.search);
  let mode = urlParams.get("mode");
  const qParam = urlParams.get("q");

  // If accessing exam.html, always set mode to "exam"
  if (window.location.pathname.includes("exam.html")) {
    mode = "exam";
    console.log("[DEBUG] Detected exam.html, mode set to:", mode);
  }
  console.log("[DEBUG] Initial mode:", mode);

  let questionOrder = [];
  let currentStep = 0; // The current step in the sequence (0 to total-1)

  // Initialize Order
  if (mode === "exam") {
    // Fresh start for exam: clear previous answers and order
    if (qParam === null) {
      localStorage.removeItem("quizAnswers");
      localStorage.removeItem("quizExamOrder");
    }

    const storedOrder = localStorage.getItem("quizExamOrder");
    if (storedOrder) {
      questionOrder = JSON.parse(storedOrder);
    } else {
      questionOrder = [...Array(quizData.length).keys()];
      // Shuffle
      for (let i = questionOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionOrder[i], questionOrder[j]] = [questionOrder[j], questionOrder[i]];
      }
      localStorage.setItem("quizExamOrder", JSON.stringify(questionOrder));
    }
  } else if (mode === "random") {
    // 既存のランダム順序があれば取得、なければ新規作成
    const storedOrder = localStorage.getItem("quizRandomOrder");
    if (storedOrder) {
      questionOrder = JSON.parse(storedOrder);
    } else {
      questionOrder = [...Array(quizData.length).keys()];
      // Shuffle
      for (let i = questionOrder.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questionOrder[i], questionOrder[j]] = [questionOrder[j], questionOrder[i]];
      }
      localStorage.setItem("quizRandomOrder", JSON.stringify(questionOrder));
    }
    // Limit to 10 questions for random mode
    questionOrder = questionOrder.slice(0, 10);
  } else if (mode === "retry") {
    // Retry mode: Load from localStorage
    const retryOrder = localStorage.getItem("quizRetryOrder");
    if (retryOrder) {
      questionOrder = JSON.parse(retryOrder);
    } else {
      // Fallback if empty
      questionOrder = [];
    }
    // Limit to 10 questions for random mode
    questionOrder = questionOrder.slice(0, 10);
  } else if (mode === "retry") {
    const retryOrder = localStorage.getItem("quizRetryOrder");
    if (retryOrder) {
      questionOrder = JSON.parse(retryOrder);
    } else {
      questionOrder = [];
    }
  } else {
    // Normal mode: 0, 1, 2...
    questionOrder = [...Array(quizData.length).keys()];
  }

  // Initialize Current Step
  if (qParam !== null && !isNaN(parseInt(qParam))) {
    // qParam is the direct index in quizData. We need to find which step corresponds to this index.
    // However, usually qParam implies direct access. 
    // If in random mode, direct access might break flow, but let's assume qParam overrides.
    // For simplicity, if qParam is set, we might just jump to that step if found, or just force direct index.
    // Let's rely on internal counter mostly. 
    // If qParam is present, we try to match it.
    const targetIndex = parseInt(qParam);
    const foundStep = questionOrder.indexOf(targetIndex);
    if (foundStep !== -1) {
      currentStep = foundStep;
    } else {
      currentStep = 0; // Fallback
    }
  } else {
    // Try to restore last step from storage if we want? 
    // Current app doesn't seem to persist "page number" across reloads strictly for index.html 
    // except via URL. Let's start at 0.
    currentStep = 0;
  }

  let currentQuestionIndex = questionOrder[currentStep];
  let userAnswers = [];
  let quizContainer = document.getElementById("quiz-container");
  const checkButton = document.getElementById("check-answer");

  const nextButton = document.createElement("button");
  nextButton.textContent = "次の問題へ";
  nextButton.id = "next-button";
  nextButton.style.display = "none";
  nextButton.addEventListener("click", () => {
    goToNextQuestion();
  });

  const nexttButton = document.getElementById("nextt-button");
  nexttButton.addEventListener("click", () => {
    goToNextQuestion();
  });

  function goToNextQuestion() {
    // Check if answered
    let userAnswers = JSON.parse(localStorage.getItem("quizAnswers")) || [];
    const questionObj = quizData[currentQuestionIndex];

    // Check if we already have an answer for this SPECIFIC question instance (by index comparison)
    // Since userAnswers array might contain answers from previous order, we need to be careful.
    // However, our logic pushes to userAnswers on "Check". 
    // If we skip, we haven't pushed.
    // BUT, if we go back and forward, we might have answered. 
    // Checking if the Last entry matches current question is one way, but naive.
    // Better: Check if we have an answer record for this questionIndex in the current session.
    // For simplicity: If we are proceeding and haven't clicked Check, we assume incorrect.

    // Actually, checking "Check Button" visibility is a decent proxy. 
    // If Check Button is visible, it means we haven't answered yet.
    if (document.getElementById("check-answer").style.display !== "none") {
      // Mark as Incorrect (Empty Answer)
      const incorrectData = {
        question: questionObj.question,
        questionIndex: currentQuestionIndex,
        userAnswer: [], // Empty
        correctAnswer: questionObj.answer
      };
      userAnswers.push(incorrectData);
      localStorage.setItem("quizAnswers", JSON.stringify(userAnswers));
    }

    currentStep++;
    if (currentStep >= questionOrder.length) {
      // Finish
      // userAnswers is already updated above or previously
      if (mode === "random") {
        localStorage.removeItem("quizRandomOrder");
      }
      if (mode === "retry") {
        localStorage.removeItem("quizRetryOrder");
      }
      if (mode === "exam") {
        localStorage.removeItem("quizExamOrder");
        localStorage.setItem("wasExamMode", "true"); // Flag for PDF export
      }
      window.location.href = "result.html";
      return;
    }
    currentQuestionIndex = questionOrder[currentStep];
    loadQuestion();
  }

  checkButton.insertAdjacentElement("afterend", nextButton);

  const showAnswerButton = document.getElementById("show-answer");

  if (showAnswerButton) {
    showAnswerButton.addEventListener("click", () => {
      const questionObj = quizData[currentQuestionIndex];
      const correctAnswer = questionObj.answer;

      let message = "正解：\n";

      if (questionObj.grouplimits) {
        // グループ形式の問題
        for (let groupName in correctAnswer) {
          const items = correctAnswer[groupName];
          message += `【${groupName}】\n${items.join("\n")}\n\n`;
        }
      } else {
        // 通常の順序問題
        for (let i = 0; i < correctAnswer.length; i++) {
          message += `${questionObj.placeholders[i]} → ${correctAnswer[i]}\n`;
        }
      }

      alert(message.trim());
    });
  }


  function loadQuestion() {
    const previousQuestionElem = document.querySelector("h2");
    if (previousQuestionElem) previousQuestionElem.remove();

    const previousResultMessage = document.querySelector(".incorrect-message");
    if (previousResultMessage) previousResultMessage.remove();

    quizContainer.innerHTML = "";
    nextButton.style.display = "none";
    checkButton.style.display = "block";
    checkButton.disabled = false;
    userAnswers = JSON.parse(localStorage.getItem("quizAnswers")) || [];

    if (currentStep >= questionOrder.length) {
      localStorage.setItem("quizAnswers", JSON.stringify(userAnswers));
      if (mode === "random") {
        localStorage.removeItem("quizRandomOrder");
      }
      if (mode === "exam") {
        localStorage.removeItem("quizExamOrder");
        localStorage.setItem("wasExamMode", "true"); // Flag for PDF export
      }
      window.location.href = "result.html";
      return;
    }

    const questionObj = quizData[currentQuestionIndex];

    const questionElem = document.createElement("h2");
    questionElem.textContent = questionObj.question;

    // Hide question text in exam mode (it contains question numbers like "Question 22")
    if (mode === "exam") {
      questionElem.style.display = "none";
    }

    quizContainer.appendChild(questionElem);

    // Update Header with Progress
    let headerTitle;
    if (mode === "exam") {
      headerTitle = document.getElementById("exam-title");
      console.log("[DEBUG] Using ID selector for exam mode. Element:", headerTitle);
    } else {
      headerTitle = document.querySelector("h1");
    }

    console.log("[DEBUG] Updating header. mode:", mode, "currentStep:", currentStep, "h1 element:", headerTitle);
    if (headerTitle) {
      const total = questionOrder.length || quizData.length;
      if (mode === "exam") {
        const newTitle = `CCNA 模擬試験 (${currentStep + 1}/${total})`;
        console.log("[DEBUG] Setting exam header to:", newTitle);
        headerTitle.textContent = newTitle;
        headerTitle.innerText = newTitle; // Try both methods
        console.log("[DEBUG] Header text after update:", headerTitle.textContent);
      } else if (mode === "random") {
        headerTitle.textContent = `ドラッグアンドドロップ練習 (${currentStep + 1} / ${total})`;
      } else if (mode === "retry") {
        headerTitle.textContent = `復習モード (${currentStep + 1} / ${total})`;
      } else {
        headerTitle.textContent = `ドラッグアンドドロップ練習 (Q${currentQuestionIndex + 1})`;
      }
    }

    const answerContainer = document.createElement("div");
    answerContainer.classList.add("answer-container");

    const shuffledChoices = [...questionObj.choice].sort(() => Math.random() - 0.5);
    shuffledChoices.forEach((choice, index) => {
      const choiceElem = document.createElement("div");
      choiceElem.classList.add("draggable");
      choiceElem.draggable = true;
      choiceElem.dataset.index = index;
      choiceElem.textContent = choice;

      choiceElem.addEventListener("dragstart", (event) => {
        event.dataTransfer.setData("text/plain", event.target.dataset.index);
        event.target.classList.add("dragging");
      });

      // --- Touch Event Support ---
      choiceElem.addEventListener("touchstart", handleTouchStart, { passive: false });
      choiceElem.addEventListener("touchmove", handleTouchMove, { passive: false });
      choiceElem.addEventListener("touchend", handleTouchEnd, { passive: false });

      choiceElem.addEventListener("dragend", (event) => {
        event.target.classList.remove("dragging");
      });

      answerContainer.appendChild(choiceElem);
    });

    quizContainer.appendChild(answerContainer);

    const dropZoneContainer = document.createElement("div");
    dropZoneContainer.classList.add("drop-zone-container");

    if (questionObj.grouplimits) {
      Object.keys(questionObj.grouplimits).forEach(group => {
        const groupContainer = document.createElement("div");
        groupContainer.classList.add("group-container");
        groupContainer.dataset.group = group;

        const groupTitle = document.createElement("h3");
        groupTitle.textContent = group;
        groupContainer.appendChild(groupTitle);

        for (let i = 0; i < questionObj.grouplimits[group]; i++) {
          const dropZone = document.createElement("div");
          dropZone.classList.add("drop-zone");
          dropZone.dataset.group = group;

          dropZone.addEventListener("dragover", (event) => {
            event.preventDefault();
            dropZone.classList.add("drag-over");
          });

          dropZone.addEventListener("dragleave", () => {
            dropZone.classList.remove("drag-over");
          });

          dropZone.addEventListener("drop", (event) => {
            event.preventDefault();
            const draggedIndex = event.dataTransfer.getData("text/plain");
            const draggedElem = document.querySelector(`.draggable[data-index='${draggedIndex}']`);

            if (dropZone.querySelector(".draggable") === null) {
              dropZone.appendChild(draggedElem);
            }

            dropZone.classList.remove("drag-over");
          });

          groupContainer.appendChild(dropZone);
        }

        dropZoneContainer.appendChild(groupContainer);
      });
    } else {
      for (let i = 0; i < questionObj.answer.length; i++) {
        const dropZone = document.createElement("div");
        dropZone.classList.add("drop-zone");
        dropZone.dataset.position = i;

        const placeholder = document.createElement("span");
        placeholder.textContent = questionObj.placeholders[i];
        placeholder.classList.add("placeholder");
        dropZone.appendChild(placeholder);

        dropZone.addEventListener("dragover", (event) => {
          event.preventDefault();
          dropZone.classList.add("drag-over");
        });

        dropZone.addEventListener("dragleave", () => {
          dropZone.classList.remove("drag-over");
        });

        dropZone.addEventListener("drop", (event) => {
          event.preventDefault();
          const draggedIndex = event.dataTransfer.getData("text/plain");
          const draggedElem = document.querySelector(`.draggable[data-index='${draggedIndex}']`);

          if (dropZone.querySelector(".draggable") === null) {
            dropZone.appendChild(draggedElem);
          }
          dropZone.classList.remove("drag-over");
        });

        dropZoneContainer.appendChild(dropZone);
      }
    }

    quizContainer.appendChild(dropZoneContainer);
  }

  checkButton.addEventListener("click", () => {
    const questionObj = quizData[currentQuestionIndex];
    const dropZones = document.querySelectorAll(".drop-zone");
    const resultMessage = document.createElement("p");
    resultMessage.classList.add("incorrect-message");

    const userAnswerData = {
      question: questionObj.question,
      questionIndex: currentQuestionIndex, // Store index for retry mode
      userAnswer: [],
      correctAnswer: questionObj.answer
    };

    let isCorrect = false;

    if (questionObj.grouplimits) {
      const correctGroups = questionObj.answer;
      const userGroupAnswers = {};

      isCorrect = Object.keys(correctGroups).every(group => {
        const groupZones = document.querySelectorAll(`.drop-zone[data-group='${group}']`);
        const selectedGroupAnswers = Array.from(groupZones).map(zone =>
          zone.querySelector(".draggable") ? zone.querySelector(".draggable").textContent.trim() : null
        );

        userGroupAnswers[group] = selectedGroupAnswers;

        if (selectedGroupAnswers.includes(null) || selectedGroupAnswers.length !== correctGroups[group].length) {
          return false;
        }

        return JSON.stringify([...selectedGroupAnswers].sort()) === JSON.stringify([...correctGroups[group]].sort());
      });

      userAnswerData.userAnswer = userGroupAnswers;

      dropZones.forEach(zone => {
        const draggable = zone.querySelector(".draggable");
        if (draggable) {
          const group = zone.dataset.group;
          const correctGroupAnswers = correctGroups[group];
          if (!correctGroupAnswers.includes(draggable.textContent.trim())) {
            draggable.style.color = "red";
          } else {
            draggable.style.color = "green";
          }
        }
      });

    } else {
      const selectedOrder = Array.from(dropZones).map(zone =>
        zone.querySelector(".draggable") ? zone.querySelector(".draggable").textContent.trim() : null
      );

      userAnswerData.userAnswer = selectedOrder;

      if (
        selectedOrder.length === questionObj.answer.length &&
        !selectedOrder.includes(null) &&
        JSON.stringify(selectedOrder) === JSON.stringify(questionObj.answer)
      ) {
        isCorrect = true;
      }

      dropZones.forEach((zone, index) => {
        const draggable = zone.querySelector(".draggable");
        if (draggable) {
          if (draggable.textContent.trim() !== questionObj.answer[index]) {
            draggable.style.color = "red";
          } else {
            draggable.style.color = "green";
          }
        }
      });
    }

    const storedAnswers = JSON.parse(localStorage.getItem("quizAnswers")) || [];
    storedAnswers.push(userAnswerData);
    localStorage.setItem("quizAnswers", JSON.stringify(storedAnswers));

    if (mode === "exam") {
      // In Exam Mode, go to next question immediately
      goToNextQuestion();
      return; // Skip the feedback display logic below
    }

    resultMessage.textContent = isCorrect ? "正解" : "不正解";
    resultMessage.style.color = isCorrect ? "green" : "red";
    quizContainer.after(resultMessage);

    checkButton.style.display = "none";
    nextButton.style.display = "block";
    // Only show answer button if it exists (not in exam mode)
    const showAnswerButton = document.getElementById("show-answer");
    if (showAnswerButton) {
      showAnswerButton.style.display = "inline-block";
    }
  });


  const resetButton = document.getElementById("reset-button");

  if (resetButton) {
    resetButton.addEventListener("click", () => {
      const questionObj = quizData[currentQuestionIndex];

      // すべてのdrop-zoneからdraggable要素を削除
      document.querySelectorAll(".drop-zone").forEach(zone => {
        const draggable = zone.querySelector(".draggable");
        if (draggable) {
          draggable.remove();
        }
      });

      // answer-containerを再描画
      const answerContainer = document.querySelector(".answer-container");
      answerContainer.innerHTML = "";

      const shuffledChoices = [...questionObj.choice].sort(() => Math.random() - 0.5);
      shuffledChoices.forEach((choice, index) => {
        const choiceElem = document.createElement("div");
        choiceElem.classList.add("draggable");
        choiceElem.draggable = true;
        choiceElem.dataset.index = index;
        choiceElem.textContent = choice;

        choiceElem.addEventListener("dragstart", (event) => {
          event.dataTransfer.setData("text/plain", event.target.dataset.index);
          event.target.classList.add("dragging");
        });

        choiceElem.addEventListener("dragend", (event) => {
          event.target.classList.remove("dragging");
        });

        answerContainer.appendChild(choiceElem);
      });

      // 正誤メッセージを削除
      const allResults = document.querySelectorAll(".incorrect-message").forEach(msg => msg.remove());

      checkButton.style.display = "block";
      checkButton.disabled = false;

      // 選択肢の色を戻す
      document.querySelectorAll(".draggable").forEach(elem => {
        elem.style.color = "";
      });

      // 必要なら「次の問題」ボタンを隠す
      nextButton.style.display = "none";

      if (allResults.length > 1) {
        for (let i = 0; i < allResults.length - 1; i++) {
          allResults[i].remove();  // 最後以外を削除
        }
      }

      checkButton.style.display = "block";
      checkButton.disabled = false;
      nextButton.style.display = "none";
      if (showAnswerButton) {
        showAnswerButton.style.display = "none";
      }
    });
  }

  const prevButton = document.getElementById("prev-button");
  if (prevButton) {
    prevButton.addEventListener("click", () => {
      if (currentStep > 0) {
        currentStep--;
        currentQuestionIndex = questionOrder[currentStep];
        loadQuestion();
      }
    });
  }

  // Define global function for exam start
  window.startExam = function () {
    console.log("[DEBUG] ====== startExam called ======");
    console.log("[DEBUG] mode:", mode);
    console.log("[DEBUG] currentStep:", currentStep);
    loadQuestion();
  };

  // For exam mode, don't load question until start button is clicked
  console.log("[DEBUG] Checking initial load. mode:", mode);
  if (mode !== "exam") {
    console.log("[DEBUG] Not exam mode, loading question immediately");
    loadQuestion();
  } else {
    console.log("[DEBUG] Exam mode detected, waiting for start button");
  }

  // --- Helper Functions for Touch Events ---
  let initialX = null;
  let initialY = null;
  let originalPosition = {};
  let draggedElement = null;

  function handleTouchStart(e) {
    e.preventDefault();
    const touch = e.touches[0];
    initialX = touch.clientX;
    initialY = touch.clientY;
    draggedElement = e.target;

    // Remember original style to restore if dropped invalidly
    originalPosition = {
      parent: draggedElement.parentNode,
      nextSibling: draggedElement.nextSibling,
      cssText: draggedElement.style.cssText
    };

    draggedElement.classList.add("dragging");
    // Make it float
    draggedElement.style.position = "fixed";
    draggedElement.style.zIndex = "1000";
    draggedElement.style.width = "200px"; // Fixed width for dragging looks better
    draggedElement.style.left = (touch.clientX - 100) + "px"; // Center horizontally
    draggedElement.style.top = (touch.clientY - 25) + "px"; // Center vertically
  }

  function handleTouchMove(e) {
    if (!draggedElement) return;
    e.preventDefault();
    const touch = e.touches[0];
    draggedElement.style.left = (touch.clientX - 100) + "px";
    draggedElement.style.top = (touch.clientY - 25) + "px";
  }

  function handleTouchEnd(e) {
    if (!draggedElement) return;
    e.preventDefault();

    draggedElement.style.display = "none"; // Hide to find element below
    const touch = e.changedTouches[0];
    const elemBelow = document.elementFromPoint(touch.clientX, touch.clientY);
    draggedElement.style.display = "flex"; // Show again

    const dropZone = elemBelow ? elemBelow.closest(".drop-zone") : null;

    if (dropZone && !dropZone.querySelector(".draggable")) {
      // Valid Drop
      resetDragStyles(draggedElement);
      dropZone.appendChild(draggedElement);
      draggedElement.classList.remove("dragging");
    } else {
      // Invalid Drop - Return to original place (or answer container if not already there)
      resetDragStyles(draggedElement);

      // If it was already in a drop zone, maybe we want to keep it there? 
      // Or if it was in answer-container. 
      // Simplest behavior: Return to available pool (answer-container) or revert.
      // Current implementation: Revert to original parent.
      if (originalPosition.parent) {
        originalPosition.parent.insertBefore(draggedElement, originalPosition.nextSibling);
      }
      draggedElement.classList.remove("dragging");
    }

    draggedElement = null;
  }

  function resetDragStyles(elem) {
    elem.style.position = "";
    elem.style.zIndex = "";
    elem.style.width = "";
    elem.style.left = "";
    elem.style.top = "";
  }
});
