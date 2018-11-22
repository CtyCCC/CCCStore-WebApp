$(document).ready(function(e) {

    jQuery.validator.addMethod("user", function(value, element) {
        return this.optional(element) || /^[A-Za-z0-9_\.]{8,32}$/g.test(value);
    }, "User chưa hợp lệ (Chỉ bao gồm a-Z 0-9 _ . và từ 8-32 ký tự)");

    jQuery.validator.addMethod("ten", function(value, element) {
        return this.optional(element) || /^[A-Za-z0-9 ]{10,50}$/g.test(value);
    }, "Tên chưa hợp lệ (Chỉ bao gồm các chữ cái và từ 10-50 ký tự)");

    $("#kt").validate({
        rules:{
            txtuser:{
                required:true,
                user: true,
            },
            txtpass:{
                required: true,
                minlength: 8,
                maxlength: 32,
            },
            txtrepass:{
                required:true,
                equalTo: "#pass",
            },
            txtten:{
                required:true,
                ten: true,
            },
            txtsdt:{
                required: true,
                number: true,
                digits: true,
                maxlength: 10,
                minlength: 10,
            },
            txtmail:{
                required: true,
                email: true,
            },
        },
        messages:{
        }
    });
});