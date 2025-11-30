const ctrl = require('./controllers/dashboardController_test');

const req = {};
const res = {
  json: (obj) => {
    console.log('=== Controller JSON response ===');
    console.log(JSON.stringify(obj, null, 2));
  },
  status: function(code) { this._status = code; return this; }
};

(async () => {
  await ctrl.getDashboardData(req, res);
})();
