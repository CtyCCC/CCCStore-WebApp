/*[Login FB]
=======================================================*/
window.fbAsyncInit = function() {
		FB.init({
		appId      : '322620955226186',
		cookie     : true,
		xfbml      : true,
		version    : 'v3.2'
	});

	function fb_login() {
  		FB.login( function() {}, { scope: 'email,public_profile' } );
	}
	FB.getLoginStatus(function(response) {
    	statusChangeCallback(response);
	});	      
};

(function(d, s, id) {
  var js, fjs = d.getElementsByTagName(s)[0];
  if (d.getElementById(id)) return;
  js = d.createElement(s); js.id = id;
  js.src = 'https://connect.facebook.net/vi_VN/sdk.js#xfbml=1&version=v3.2&appId=322620955226186&autoLogAppEvents=1';
  fjs.parentNode.insertBefore(js, fjs);
}(document, 'script', 'facebook-jssdk'));

/// login thanh công lấy dữ liệu gì lấy từ response
function statusChangeCallback(response){
	if(response=='connected')
		console.log('Thanh Cong');
	else
		console.log('That bai');
}
/*[******]
=======================================================*/
