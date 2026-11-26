
;(function(){
  var ready=false;
  function parity(a){var p=0;for(var i=0;i<a.length;i++)for(var j=i+1;j<a.length;j++)if(a[i]>a[j])p^=1;return p;}
  self.onmessage=function(e){var m=e.data;
    if(m.cmd==='init'){if(!ready){Cube.initSolver();ready=true;}self.postMessage({cmd:'init'});return;}
    if(m.cmd==='solve'){if(!ready){Cube.initSolver();ready=true;}
      var c=Cube.fromString(m.str);
      if(c.asString()!==m.str){self.postMessage({cmd:'solve',error:'pieces'});return;}
      var co=c.co.reduce(function(a,b){return a+b;},0),eo=c.eo.reduce(function(a,b){return a+b;},0);
      if(co%3){self.postMessage({cmd:'solve',error:'corner'});return;}
      if(eo%2){self.postMessage({cmd:'solve',error:'edge'});return;}
      if(parity(c.cp)!==parity(c.ep)){self.postMessage({cmd:'solve',error:'parity'});return;}
      self.postMessage({cmd:'solve',solution:c.solve()});}
  };
})();
