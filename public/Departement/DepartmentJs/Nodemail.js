// let name = document.querySelector("#taskName").innerText ;
    
document.getElementById('sendEmailBtn').addEventListener('submit', function() {
                fetch('/sendemail', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                name: `${document.querySelector("#taskName").innerText}`,
                email: `${document.querySelector("#email").innerText}`,
                message: `Dear ${document.querySelector("#taskName").innerText}, Your request to extend the ${document.querySelector("#taskName").innerText} project has been forwarded to the appropriate department for consideration. We'll provide you with an update as soon as we have more information `,
                
            })
        })
        .then(response => {
            if (response.ok) {
                console.log('Email sent successfully');
            } else {
                console.error('Error sending email');
            }
        })
        .catch(error => {
            console.error('Error sending email:', error);
       });
    });

