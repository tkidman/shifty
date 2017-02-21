const express = require('express');
const path = require('path');
const favicon = require('serve-favicon');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const busboy = require('connect-busboy');
const bodyParser = require('body-parser');
const fs = require('fs');
const shifty = require('./src/shifty');
const shiftyLogger = require('./src/common').logger;

const app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
// app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(busboy());
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res, next) => {
  res.render('index', { title: 'Shifty' });
});

app.post('/run', (req, res, next) => {
  req.pipe(req.busboy);
  let fstream;
  req.busboy.on('file', (fieldname, file, filename) => {
    const fullFilename = `./uploads/${filename}`;
    fstream = fs.createWriteStream(fullFilename);
    file.pipe(fstream);
    fstream.on('close', () => {
      shifty.run(fullFilename).then((runResult) => {
        res.render('index', { title: 'Shifty', roster: runResult.roster });
      });
    });
  });
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
  const err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use((err, req, res, next) => {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

app.listen(3000, () => {
  shiftyLogger.info('listening on port 3000');
});

module.exports = app;
