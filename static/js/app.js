'use strict';
var app = angular.module('app',['ngRoute', 'ngAnimate', 'uiSwitch']);
app.config(['$routeProvider', '$locationProvider',
  function($routeProvider, $locationProvider) {

    $routeProvider
      .when('/home', {
        templateUrl: 'views/home.html?v=1.1.3.1',
        controller: 'home_ctrl',
        controllerAs: 'home'
      })
      .when('/data', {
        templateUrl: 'views/data.html?v=1.1.3',
        controller: 'data_ctrl',
        controllerAs: 'data'
      })
      .when('/uc1', {
        templateUrl: 'views/uc1.html?v=1.1.3',
        controller: 'uc1_ctrl',
        controllerAs: 'uc1c'
      })
      .when('/uc2', {
        templateUrl: 'views/uc2.html?v=1.1.3',
        controller: 'uc2_ctrl',
        controllerAs: 'uc2c'
      })
      .when('/uc3', {
        templateUrl: 'views/uc3.html?v=1.1.3',
        controller: 'uc3_ctrl',
        controllerAs: 'uc3c'
      })
      .when('/uc4', {
        templateUrl: 'views/uc4.html?v=1.1.3',
        controller: 'uc4_ctrl',
        controllerAs: 'uc4c'
      })
      .when('/uc5', {
        templateUrl: 'views/uc5.html?v=1.1.3',
        controller: 'uc5_ctrl',
        controllerAs: 'uc5c'
      }).when('/uc6', {
        templateUrl: 'views/uc6.html?v=1.1.3',
        controller: 'uc6_ctrl',
        controllerAs: 'uc6c'
      }).otherwise('/home');

}]);

app.filter('reverse', function() {
  return function(items) {
    return items.slice().reverse();
  };
});



/*app.directive('windowResize', ['$window', function ($window) {

     return {
        link: link,
        restrict: 'A'           
     };

     function link(scope, element, attrs){

       angular.element($window).bind('resize', function(scope){
      
               scope.reload();
       },scope);    
     }    
 }]);*/