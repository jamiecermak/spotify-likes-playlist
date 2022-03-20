// Builds lambda event responses
class Response {
    static Event(statusCode, error, data, message) {
        return {
            statusCode,
            body: JSON.stringify({
                success: !error,
                message,
                data,
            }),
        }
    }

    static OK(data = {}, message = null) {
        return Response.Event(200, false, data, message)
    }

    static Error(statusCode = 500, data = {}, message = null) {
        return Response.Event(statusCode, true, data, message)
    }

    static Unauthorised() {
        return Response.Event(401, true, {}, 'Unauthorized')
    }
}

module.exports = { Response }
