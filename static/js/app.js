var app = angular.module('app',['ngRoute']);
app.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {

    $routeProvider
      .when('/home', {
        templateUrl: 'views/home.html',
        controller: 'home_ctrl',
        controllerAs: 'home'
      })
      .when('/data', {
        templateUrl: 'views/data.html',
        controller: 'data_ctrl',
        controllerAs: 'data'
      })
      .when('/uc1', {
        templateUrl: 'views/uc1.html',
        controller: 'uc1_ctrl',
        controllerAs: 'uc1c'
      })
      .when('/uc2', {
        templateUrl: 'views/uc2.html',
        controller: 'uc2_ctrl',
        controllerAs: 'uc2c'
      })
      .when('/uc3', {
        templateUrl: 'views/uc3.html',
        controller: 'uc3_ctrl',
        controllerAs: 'uc3c'
      })
      .when('/uc4', {
        templateUrl: 'views/uc4.html',
        controller: 'uc4_ctrl',
        controllerAs: 'uc4c'
      }).otherwise('/home');

}]);