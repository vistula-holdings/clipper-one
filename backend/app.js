var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');
const i18next = require('i18next');
const i18nextMiddleware = require('i18next-http-middleware');
const session = require('express-session');

// .env file variables
require('dotenv').config();

// 1. Init langs
i18next.use(i18nextMiddleware.LanguageDetector)
.init({
  preload: ['en', 'it', 'pl', 'es'], // Langs supported
  fallbackLng: process.env.DEFAULT_LANG || 'en',           // Lang by default.
  detection: {
    order: ['querystring', 'cookie', 'header'], // First, search into the URL (?lng=)
    lookupQuerystring: 'lng',
    caches: ['cookie']
  },
  resources: {
    en: { translation: require('./locals/en.json') },
    it: { translation: require('./locals/it.json') },
    pl: { translation: require('./locals/pl.json') },
    es: { translation: require('./locals/es.json') }
  }
});

// Handle-bars HBS extensions
const { engine } = require('express-handlebars'); // Recent versions
const cors = require('cors'); // 

var app = express();

// View engine setup, shift to hbs engine
// New setup of engine instead using the function expressHbs()
app.set('views', path.join(__dirname, 'views'));

app.engine('.hbs', engine({
  defaultLayout: 'layout', // Calling layout.hbs in views/layouts
  layoutsDir: path.join(__dirname, 'views/layouts'),
  extname: '.hbs',
  runtimeOptions: {
    allowProtoPropertiesByDefault: true,
    allowProtoMethodsByDefault: true,
  },
  helpers: {
    eq: (a, b) => a === b,
    t: function(key, options) {
    // This takes the function from res.locals and settle in Handlebars secure
    const translationFn = options.data.root.t;
    return translationFn ? translationFn(key) : key;
  },
  formatDate: function(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
      if (isNaN(date.getTime())) return dateString; // If not a valid date, send the original string

      // Formato Alfi
      const pad = (num) => String(num).padStart(2, '0');
      const year = date.getFullYear();
      const month = pad(date.getMonth() + 1); // Los meses van de 0 a 11
      const day = pad(date.getDate());
      const hours = pad(date.getHours());
      const minutes = pad(date.getMinutes());

      return `${year}-${month}-${day} ${hours}:${minutes}`;
    }
  },
    // Jesli potrzebujesz wiecej helpers, pisac dalej z ,
}));

app.set('view engine', 'hbs');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Apply session
app.use(session({
  secret: process.env.SESSION_SECRET || '09e80e79-3b0b-11f1-ab25-e82aea0ba9e6',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: false, // False for HTTP in localhost
    maxAge: 1000 * 60 * 60 * 24 
  }
}));

// Conect i18next with Express
app.use(i18nextMiddleware.handle(i18next));
// Create an "Helper" global due .hbs files could translate
app.use((req, res, next) => {
  console.log(`[DEBUG i18n] URL: ${req.url} | Lang detected?: ${req.language}`);
  console.log(`[LOG] Request action: ${req.method} lang: ${req.url}`);
  // This let Handlebars use the function {{t "key"}}
  res.locals.t = (key) => req.t(key); 
  res.locals.currentLng = req.language;
  res.locals.userEmail = req.session.user?.s_email;
  next();
});

// Enviroment of the web app either DEV or PROD
const isProduction = process.env.NODE_ENV === 'production';
app.use((req, res, next) => {
    console.log(`[LOG] Request: ${req.method} ${req.url}`); // Link of the URL ?
    res.locals.isProduction = isProduction;
    res.locals.envName = process.env.NODE_ENV ? process.env.NODE_ENV.toUpperCase() : 'DEV';
    next();
});

app.use(cors()); // Allow to communicate between URL links

// Routes of the web pages
var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');
var loginRouter = require('./routes/login');
var logoutRouter = require('./routes/logout');
var orgPilotRouter = require('./routes/org-pilot');
var orgCabincrewRouter = require('./routes/org-cabincrew');
var confirmParticipationRouter = require('./routes/confirm-participation');
var adminReportsRouter = require('./routes/admin-reports');


// URL links of the web pages
app.use('/index', indexRouter);
app.use('/users', usersRouter);
app.use('/login', loginRouter);
app.use('/logout', logoutRouter);
app.use('/org-pilot', orgPilotRouter);
app.use('/org-cabincrew', orgCabincrewRouter);
app.use('/confirm-participation', confirmParticipationRouter);
app.use('/admin-reports', adminReportsRouter);


app.get('/', (req, res) => {
  res.redirect('/index/start?lng=' + (req.language || 'pl'));
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
