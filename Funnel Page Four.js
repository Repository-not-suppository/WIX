import wixLocation from 'wix-location';
import wixData from 'wix-data';
import { memory } from 'wix-storage';

$w.onReady(async function () {
    console.log("🚀 Page 4 loaded.");
    $w('#nextButton').disable();
    $w('#errorMessage').hide();

    // Retrieve Trust Name from memory (must exist from Page 1)
    let trustName = memory.getItem("trustName");
    if (!trustName) {
        console.error("❌ Trust Name missing from memory.");
        return;
    }
    console.log("✅ Trust Name retrieved:", trustName);

    // Retrieve stored secondary contact details
    let storedFirstName2 = memory.getItem("firstName2") || "";
    let storedLastName2 = memory.getItem("lastName2") || "";
    let storedEmail2 = memory.getItem("email2") || "";
    let storedAddress2 = memory.getItem("address2") || "";

    // Fetch existing data from database
    let existingRecord;
    try {
        let queryResult = await wixData.query("LandingPageUserSubmissions")
            .eq("trustName", trustName) // Fetch the correct row
            .find();

        if (queryResult.items.length > 0) {
            existingRecord = queryResult.items[0];
            console.log("✅ Existing record found:", existingRecord);

            // Auto-fill input fields but prioritize memory storage
            if (!storedFirstName2 && existingRecord.firstName2) {
                storedFirstName2 = existingRecord.firstName2;
                memory.setItem("firstName2", existingRecord.firstName2);
            }
            if (!storedLastName2 && existingRecord.lastName2) {
                storedLastName2 = existingRecord.lastName2;
                memory.setItem("lastName2", existingRecord.lastName2);
            }
            if (!storedEmail2 && existingRecord.email2) {
                storedEmail2 = existingRecord.email2;
                memory.setItem("email2", existingRecord.email2);
            }
            if (!storedAddress2 && existingRecord.address2) {
                storedAddress2 = existingRecord.address2;
                memory.setItem("address2", existingRecord.address2);
            }
        } else {
            console.error("❌ ERROR: No existing record found for Trust Name:", trustName);
        }
    } catch (error) {
        console.error("❌ Database Query Error:", error.message);
    }

    // Set values in the fields and validate them
    $w('#firstName2Input').value = storedFirstName2;
    $w('#lastName2Input').value = storedLastName2;
    $w('#email2Input').value = storedEmail2;
    $w('#address2Input').value = storedAddress2;
    validateFields();

    function validateFields() {
        const firstName2 = $w('#firstName2Input').value.trim();
        const lastName2 = $w('#lastName2Input').value.trim();
        const email2 = $w('#email2Input').value.trim();
        const address2 = $w('#address2Input').value.trim();


        if (firstName2 !== "" && lastName2 !== "" && email2 !== ""&& address2 !== "") {
            console.log("✅ Inputs detected. Enabling Next Button.");
            $w('#nextButton').enable();
        } else {
            console.log("⚠️ Inputs missing. Disabling Next Button.");
            $w('#nextButton').disable();
        }
    }

    $w('#firstName2Input').onInput(() => {
        memory.setItem("firstName2", $w('#firstName2Input').value.trim());
        validateFields();
    });

    $w('#lastName2Input').onInput(() => {
        memory.setItem("lastName2", $w('#lastName2Input').value.trim());
        validateFields();
    });

    $w('#email2Input').onInput(() => {
        memory.setItem("email2", $w('#email2Input').value.trim());
        validateFields();
    });

    $w('#address2Input').onInput(() => {
        memory.setItem("address2", $w('#address2Input').value.trim());
        validateFields();
    });

    function showError(message) {
        console.error("❌ ERROR:", message);
        $w('#errorMessage').text = message;
        $w('#errorMessage').show();
    }

    function hideError() {
        $w('#errorMessage').hide();
    }

    async function submitDataAndNavigate(destination) {
        const firstName2 = $w('#firstName2Input').value.trim();
        const lastName2 = $w('#lastName2Input').value.trim();
        const email2 = $w('#email2Input').value.trim();
        const address2 = $w('#address2Input').value.trim();

        if (firstName2 === "" || lastName2 === "" || email2 === "" || address2 === "") {
            showError("Error: All fields are required.");
            return;
        }

        console.log("📩 Saving Secondary Contact Details:", firstName2, lastName2, email2, address2);
        memory.setItem("firstName2", firstName2);
        memory.setItem("lastName2", lastName2);
        memory.setItem("email2", email2);
        memory.setItem("address2", address2);

        try {
            let existingRecord = await wixData.query("LandingPageUserSubmissions")
                .eq("trustName", trustName) // Ensure we get the correct row
                .find();

            if (existingRecord.items.length > 0) {
                let existingId = existingRecord.items[0]._id;
                let updatedData = {
                    _id: existingId,
                    trustName, // Preserve trust name
                    firstName2,
                    lastName2,
                    email2,
                    address2,
                    ...existingRecord.items[0] // Preserve other fields to prevent data loss
                };

                console.log("🔄 Updating existing record:", updatedData);
                await wixData.update("LandingPageUserSubmissions", updatedData);

                console.log("✅ Data saved. Navigating to:", destination);
                await new Promise(resolve => setTimeout(resolve, 300)); // Short delay ensures DB updates complete
                wixLocation.to(destination);
            } else {
                console.error("❌ ERROR: No existing record found for Trust Name:", trustName);
                showError("Error: Data inconsistency detected. Please restart the process.");

                // Log issue in errorLog field
                await wixData.insert("LandingPageUserSubmissions", {
                    trustName,
                    errorLog: "ERROR: No existing row found on Page 4."
                });
            }
        } catch (error) {
            let errorMessage = `Database error: ${error.message}`;
            showError(errorMessage);

            // Log error in the database
            try {
                let existingRecord = await wixData.query("LandingPageUserSubmissions")
                    .eq("trustName", trustName)
                    .find();

                if (existingRecord.items.length > 0) {
                    let existingId = existingRecord.items[0]._id;
                    await wixData.update("LandingPageUserSubmissions", {
                        _id: existingId,
                        errorLog: errorMessage
                    });
                    console.log("📝 Error logged in existing entry.");
                } else {
                    await wixData.insert("LandingPageUserSubmissions", {
                        trustName,
                        errorLog: errorMessage
                    });
                    console.log("📝 Error logged as new entry.");
                }
            } catch (logError) {
                console.error("❌ Failed to log error in database:", logError.message);
            }
        }
    }

    // ✅ Next and Back buttons now use the same logic, only page destination changes
    $w('#nextButton').onClick(() => submitDataAndNavigate("https://your-stripe-paylink-url.com"));
    $w('#backButton').onClick(() => submitDataAndNavigate("/signup-Zba2"));

    // ✅ Skip button redirects to payment page
    $w('#skipButton').onClick(() => {
        console.log("⚡ Skipping to payment...");
        wixLocation.to("https://your-stripe-paylink-url.com");
    });
});
