// Constants
const STORAGE_KEY = 'todoList';
const MAX_CHAR_LIMIT = 120;
const NOTIFICATION_DURATION = 3000;

// State management
let todoList = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
let isEditing = false;
let editIndex = null;
let currentSortMethod = 'date';
let currentSortOrder = 'asc';
let currentCategorySortOrder = 'asc';
let filterMethod = 'all';

// DOM Elements
const elements = {
  nameInput: document.querySelector('.js-name-input'),
  dateInput: document.querySelector('.js-date-input'),
  timeInput: document.querySelector('.js-time-input'),
  categoryInput: document.querySelector('.js-category-input'),
  priorityInput: document.querySelector('.js-priority-input'),
  addButton: document.querySelector('.js-add-button'),
  cancelButton: document.querySelector('.js-cancel-button'),
  todoListContainer: document.querySelector('.js-add-html'),
  successNotification: document.getElementById('js-success-notification'),
  taskCounter: document.querySelector('.task-counter-button'),
  filterInput: document.querySelector('.js-filter-input')
};

// Initialize the application
function initializeApp() {
  setDefaultDateTime();
  setupEventListeners();
  updateTodoList();
  updateTaskCounter();
  updateUIExtras();
  addDeleteAllButton();
}

// Event Listeners
function setupEventListeners() {
  elements.nameInput.addEventListener('input', handleNameInput);
  elements.addButton.addEventListener('click', addTodo);
  elements.cancelButton.addEventListener('click', cancelEditTodo);
  if (elements.filterInput) elements.filterInput.addEventListener('change', filterTodosHandler);
}

// Input Handlers
function handleNameInput(e) {
  const input = e.target.value;
  if (input.length >= MAX_CHAR_LIMIT) {
    showNotification('Maximum character limit reached', 'warning');
  }
}

// Core Todo Functions
function addTodo() {
  const todoData = {
    name: elements.nameInput.value.trim(),
    date: elements.dateInput.value,
    time: elements.timeInput.value,
    category: elements.categoryInput.value,
    priority: elements.priorityInput.value,
    completed: false
  };

  if (!validateTodoData(todoData)) {
    return;
  }

  if (isEditing && editIndex !== null) {
    updateExistingTodo(todoData);
  } else {
    createNewTodo(todoData);
  }

  clearInputs();
  updateTodoList();
  updateTaskCounter();
  showNotification(isEditing ? 'Task updated successfully!' : 'Task added successfully!', 'success');
}

function validateTodoData(todoData) {
  if (!todoData.name || !todoData.date || !todoData.time || !todoData.category || !todoData.priority) {
    showNotification('Please fill in all fields', 'error');
    return false;
  }

  if (todoData.date < elements.dateInput.min) {
    showNotification('Please select a current or future date', 'error');
    return false;
  }

  if (todoData.time < elements.timeInput.min && todoData.date === elements.dateInput.min) {
    showNotification('Please select a future time', 'error');
    return false;
  }

  return true;
}

function updateExistingTodo(todoData) {
  todoList[editIndex] = todoData;
  resetEditMode();
}

function createNewTodo(todoData) {
  todoList.push(todoData);
}

function deleteTodo(index) {
  if (confirm('Are you sure you want to delete this task?')) {
  todoList.splice(index, 1);
    saveTodoList();
  updateTodoList();
  updateTaskCounter();
    showNotification('Task deleted successfully!', 'success');
  }
}

function editTodo(index) {
  const todo = todoList[index];
  
  elements.nameInput.value = todo.name;
  elements.dateInput.value = todo.date;
  elements.timeInput.value = todo.time;
  elements.categoryInput.value = todo.category;
  elements.priorityInput.value = todo.priority;

  isEditing = true;
  editIndex = index;
  elements.cancelButton.classList.remove('hidden');
  elements.addButton.innerHTML = '<i class="fa-solid fa-check mr-1"></i> Update Task';
}

function cancelEditTodo() {
  resetEditMode();
  clearInputs();
}

// UI Updates
function updateTodoList() {
  let filteredTodos = filterTodos(todoList);
  sortTodos(filteredTodos);
  
  elements.todoListContainer.innerHTML = filteredTodos.map((todo, index) => `
    <div class="bg-white rounded-lg shadow-md p-4 flex items-center justify-between ${todo.completed ? 'opacity-75' : ''}">
      <div class="flex items-center space-x-4 flex-grow">
        <input 
          type="checkbox" 
          class="w-5 h-5 rounded border-gray-300 text-purple-600 focus:ring-purple-500"
          ${todo.completed ? 'checked' : ''}
          onchange="toggleComplete(${index})"
        >
        <div class="flex-grow">
          <p class="text-gray-800 ${todo.completed ? 'line-through' : ''}">${todo.name}</p>
          <div class="flex items-center space-x-2 mt-1">
            <span class="text-sm text-gray-500">
              <i class="fa-regular fa-calendar mr-1"></i>${todo.date}
            </span>
            <span class="text-sm text-gray-500">
              <i class="fa-regular fa-clock mr-1"></i>${todo.time}
            </span>
            <span class="px-2 py-1 text-xs rounded-full ${getCategoryClass(todo.category)}">
              ${todo.category}
            </span>
            <span class="px-2 py-1 text-xs rounded-full ${getPriorityClass(todo.priority)}">
              ${todo.priority}
            </span>
          </div>
        </div>
      </div>
      <div class="flex items-center space-x-2">
        <button 
          onclick="editTodo(${index})"
          class="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors"
          title="Edit task"
        >
          <i class="fa-solid fa-edit"></i>
        </button>
        <button 
          onclick="deleteTodo(${index})"
          class="p-2 text-red-600 hover:bg-red-50 rounded-full transition-colors"
          title="Delete task"
        >
          <i class="fa-solid fa-trash"></i>
        </button>
      </div>
    </div>
  `).join('');

  saveTodoList();
  updateUIExtras();
}

function filterTodos(todos) {
  const filterSelect = document.querySelector('.js-filter-input');
  let filterValue = 'all';
  if (filterSelect) {
    filterValue = filterSelect.value;
  }
  return todos.filter(todo => {
    if (filterValue === 'pending') return !todo.completed;
    if (filterValue === 'completed') return todo.completed;
    return true;
  });
}

function sortTodos(todos) {
  todos.sort((a, b) => {
    if (currentSortMethod === 'date') {
      return new Date(a.date + ' ' + a.time) - new Date(b.date + ' ' + b.time);
    } else if (currentSortMethod === 'category') {
      return currentCategorySortOrder === 'asc'
        ? a.category.localeCompare(b.category)
        : b.category.localeCompare(a.category);
    } else if (currentSortMethod === 'priority') {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return currentSortOrder === 'asc'
        ? priorityOrder[a.priority] - priorityOrder[b.priority]
        : priorityOrder[b.priority] - priorityOrder[a.priority];
    }
  });
}

function toggleComplete(index) {
  todoList[index].completed = !todoList[index].completed;
  saveTodoList();
  updateTodoList();
  updateTaskCounter();
  
  if (todoList[index].completed) {
    showNotification('Task completed! 🎉', 'success');
  }
}

function updateTaskCounter() {
  const total = todoList.length;
  const completed = todoList.filter(todo => todo.completed).length;
  elements.taskCounter.textContent = `Tasks: ${completed}/${total}`;
}

// Utility Functions
function setDefaultDateTime() {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  const currentTime = now.toTimeString().slice(0, 5);
  
  elements.dateInput.min = today;
  elements.dateInput.value = today;
  elements.timeInput.value = currentTime;
}

function resetEditMode() {
  isEditing = false;
  editIndex = null;
  elements.cancelButton.classList.add('hidden');
  elements.addButton.innerHTML = '<i class="fa-solid fa-plus mr-1"></i> Add Task';
}

function clearInputs() {
  elements.nameInput.value = '';
  elements.categoryInput.value = '';
  elements.priorityInput.value = '';
  setDefaultDateTime();
}

function saveTodoList() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(todoList));
}

function showNotification(message, type = 'success') {
  const notification = elements.successNotification;
  notification.className = `fixed bottom-4 right-4 px-6 py-3 rounded-lg shadow-lg flex items-center ${getNotificationClass(type)}`;
  notification.innerHTML = `
    <i class="${getNotificationIcon(type)} mr-2"></i>
    <p>${message}</p>
  `;
  notification.classList.remove('hidden');
  
  setTimeout(() => {
    notification.classList.add('hidden');
  }, NOTIFICATION_DURATION);
}

// Style Utility Functions
function getCategoryClass(category) {
  const classes = {
    work: 'bg-blue-100 text-blue-800',
    personal: 'bg-green-100 text-green-800',
    shopping: 'bg-yellow-100 text-yellow-800',
    health: 'bg-pink-100 text-pink-800',
    education: 'bg-indigo-100 text-indigo-800',
    other: 'bg-gray-100 text-gray-800'
  };
  return classes[category] || classes.other;
}

function getPriorityClass(priority) {
  const classes = {
    high: 'bg-red-100 text-red-800',
    medium: 'bg-yellow-100 text-yellow-800',
    low: 'bg-green-100 text-green-800'
  };
  return classes[priority];
  }

function getNotificationClass(type) {
  const classes = {
    success: 'bg-green-500 text-white',
    error: 'bg-red-500 text-white',
    warning: 'bg-yellow-500 text-white'
  };
  return classes[type] || classes.success;
}

function getNotificationIcon(type) {
  const icons = {
    success: 'fa-solid fa-check-circle',
    error: 'fa-solid fa-exclamation-circle',
    warning: 'fa-solid fa-exclamation-triangle'
  };
  return icons[type] || icons.success;
}

// Ensure filter dropdown updates the list
function filterTodosHandler() {
  updateTodoList();
}

// Add Delete All button below the task list
function addDeleteAllButton() {
  const main = document.querySelector('main');
  if (!main) return;
  let btn = document.getElementById('delete-all-btn');
  if (!btn) {
    btn = document.createElement('button');
    btn.id = 'delete-all-btn';
    btn.className = 'mt-6 px-6 py-3 bg-red-600 text-white rounded-lg shadow-lg hover:bg-red-700 transition-colors block mx-auto';
    btn.innerHTML = '<i class="fa-solid fa-trash mr-2"></i>Delete All Tasks';
    btn.onclick = deleteAllTasks;
    main.appendChild(btn);
  }
}

function deleteAllTasks() {
  if (confirm('Are you sure you want to delete all tasks?')) {
    todoList = [];
    saveTodoList();
  updateTodoList();
    updateTaskCounter();
    showNotification('All tasks deleted!', 'success');
  }
}

// --- Calendar Weekdays Bar and Upcoming Tasks Slide ---
function renderCalendarBar() {
  const bar = document.getElementById('calendar-bar');
  if (!bar) return;
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const today = new Date();
  const week = [];
  // Get the start of the week (Monday)
  const start = new Date(today);
  start.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    week.push(d);
  }
  bar.innerHTML = week.map(d => {
    const isToday = d.toDateString() === today.toDateString();
    return `<div class="flex flex-col items-center w-1/7">
      <span class="text-xs text-gray-500">${days[d.getDay()]}</span>
      <span class="text-lg font-bold ${isToday ? 'text-purple-600' : 'text-gray-800'} ${isToday ? 'bg-purple-100 rounded-full px-3 py-1' : ''}">${d.getDate()}</span>
    </div>`;
  }).join('');
}

function renderUpcomingTasks() {
  const slide = document.getElementById('upcoming-tasks-slide');
  if (!slide) return;
  const now = new Date();
  const weekAhead = new Date();
  weekAhead.setDate(now.getDate() + 7);
  // Filter tasks due in the next 7 days
  const upcoming = todoList.filter(task => {
    const taskDate = new Date(task.date + 'T' + (task.time || '00:00'));
    return taskDate >= now && taskDate <= weekAhead;
  }).sort((a, b) => new Date(a.date + 'T' + (a.time || '00:00')) - new Date(b.date + 'T' + (b.time || '00:00')));
  if (upcoming.length === 0) {
    slide.innerHTML = '<div class="text-gray-400 italic">No upcoming tasks</div>';
    return;
  }
  slide.innerHTML = upcoming.map(task => `
    <div class="min-w-[220px] bg-white rounded-lg shadow p-4 flex flex-col justify-between border border-purple-100">
      <div class="font-semibold text-gray-800 mb-1">${task.name}</div>
      <div class="text-xs text-gray-500 mb-2">${task.date}${task.time ? ' ' + task.time : ''}</div>
      <div class="flex space-x-2 text-xs">
        <span class="px-2 py-1 rounded-full ${getCategoryClass(task.category)}">${task.category}</span>
        <span class="px-2 py-1 rounded-full ${getPriorityClass(task.priority)}">${task.priority}</span>
      </div>
    </div>
  `).join('');
}

// Call these after every update
function updateUIExtras() {
  renderCalendarBar();
  renderUpcomingTasks();
}

// Initialize the application
document.addEventListener('DOMContentLoaded', initializeApp);
